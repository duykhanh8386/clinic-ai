import { prisma } from "../config/prisma.js";
import { generateOtp6, hashOtp } from "../utils/otp.js";
import { sendEmailOtp } from "../utils/mailer.sendgrid.js";

function minutes(n) {
  return n * 60 * 1000;
}

async function checkSendLimit({ userId, purpose, windowMinutes = 15 }) {
  const limit = Number(process.env.OTP_SEND_LIMIT_15M || 3);
  const since = new Date(Date.now() - minutes(windowMinutes));

  const count = await prisma.otpCode.count({
    where: { userId, purpose, createdAt: { gte: since } },
  });

  if (count >= limit) {
    const err = new Error("Too many OTP requests. Try later.");
    err.statusCode = 429;
    err.code = "OTP_RATE_LIMIT";
    throw err;
  }
}

export async function requestEmailVerifyOtp(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }
  if (user.emailVerifiedAt) {
    const err = new Error("Email already verified");
    err.statusCode = 400;
    err.code = "EMAIL_ALREADY_VERIFIED";
    throw err;
  }

  await checkSendLimit({ userId, purpose: "VERIFY_EMAIL" });

  const ttl = Number(process.env.OTP_TTL_MINUTES || 10);
  const code = generateOtp6();
  const expiresAt = new Date(Date.now() + minutes(ttl));
  const codeHash = hashOtp({
    code,
    target: user.email,
    purpose: "VERIFY_EMAIL",
    secret: process.env.OTP_SECRET || "dev",
  });

  await prisma.otpCode.create({
    data: {
      userId,
      channel: "EMAIL",
      purpose: "VERIFY_EMAIL",
      target: user.email,
      codeHash,
      expiresAt,
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    },
  });

  await sendEmailOtp({ to: user.email, code });
  return { sentTo: user.email, expiresInSec: ttl * 60 };
}

export async function confirmEmailVerifyOtp(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId,
      purpose: "VERIFY_EMAIL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    const err = new Error("OTP not found or expired");
    err.statusCode = 400;
    err.code = "OTP_INVALID";
    throw err;
  }

  if (otp.attempts >= otp.maxAttempts) {
    const err = new Error("OTP max attempts exceeded");
    err.statusCode = 400;
    err.code = "OTP_LOCKED";
    throw err;
  }

  const inputHash = hashOtp({
    code,
    target: user.email,
    purpose: "VERIFY_EMAIL",
    secret: process.env.OTP_SECRET || "dev",
  });

  if (inputHash !== otp.codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const err = new Error("Invalid OTP");
    err.statusCode = 400;
    err.code = "OTP_INVALID";
    throw err;
  }

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
  ]);

  return { ok: true };
}