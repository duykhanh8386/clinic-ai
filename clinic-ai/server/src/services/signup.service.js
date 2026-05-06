import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateOtp6, hashOtp } from "../utils/otp.js";
import { sendEmailOtp } from "../utils/mailer.sendgrid.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { sha256 } from "../utils/sha256.js";
import { toMs } from "../utils/time.js";

function minutes(n) { return n * 60 * 1000; }
function otpTtlMs() { return minutes(Number(process.env.OTP_TTL_MINUTES || 5)); }
function signupTtlMs() { return minutes(Number(process.env.SIGNUP_SESSION_TTL_MINUTES || 30)); }
function cooldownMs() { return Number(process.env.OTP_RESEND_COOLDOWN_SEC || 60) * 1000; }
function maxAttempts() { return Number(process.env.OTP_MAX_ATTEMPTS || 5); }

async function createAndSendOtp(signupId, email) {
  const code = generateOtp6();
  await prisma.signupOtpCode.create({
    data: {
      signupId,
      codeHash: hashOtp({ code, email }),
      expiresAt: new Date(Date.now() + otpTtlMs()),
      maxAttempts: maxAttempts(),
    },
  });

  await sendEmailOtp({ to: email, code });
  return {
    otpExpiresInSec: Math.floor(otpTtlMs() / 1000),
    resendAfterSec: Math.floor(cooldownMs() / 1000),
  };
}

export async function signupStart({ fullName, email, password, phone }) {
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) {
    const err = new Error("Email already exists");
    err.statusCode = 409; err.code = "EMAIL_EXISTS";
    throw err;
  }

  await prisma.signupSession.deleteMany({ where: { email } });

  const passwordHash = await bcrypt.hash(password, 10);
  const session = await prisma.signupSession.create({
    data: {
      email,
      fullName,
      phone: phone || null,
      passwordHash,
      expiresAt: new Date(Date.now() + signupTtlMs()),
    },
    select: { id: true, email: true },
  });

  const otpInfo = await createAndSendOtp(session.id, session.email);
  return { signupId: session.id, ...otpInfo };
}

export async function signupResend({ signupId }) {
  const session = await prisma.signupSession.findUnique({ where: { id: signupId } });
  if (!session || session.expiresAt <= new Date()) {
    const err = new Error("Signup session expired");
    err.statusCode = 400; err.code = "SIGNUP_EXPIRED";
    throw err;
  }

  const last = await prisma.signupOtpCode.findFirst({
    where: { signupId },
    orderBy: { createdAt: "desc" },
  });

  if (last) {
    const delta = Date.now() - last.createdAt.getTime();
    if (delta < cooldownMs()) {
      const retryAfterSec = Math.ceil((cooldownMs() - delta) / 1000);
      const err = new Error(`Please wait ${retryAfterSec}s before resend`);
      err.statusCode = 429; err.code = "OTP_RESEND_COOLDOWN";
      err.retryAfterSec = retryAfterSec;
      throw err;
    }
  }

  return await createAndSendOtp(signupId, session.email);
}

export async function signupVerify({ signupId, code }) {
  const session = await prisma.signupSession.findUnique({ where: { id: signupId } });
  if (!session || session.expiresAt <= new Date()) {
    const err = new Error("Signup session expired");
    err.statusCode = 400; err.code = "SIGNUP_EXPIRED";
    throw err;
  }

  const otp = await prisma.signupOtpCode.findFirst({
    where: { signupId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    const err = new Error("OTP not found or expired");
    err.statusCode = 400; err.code = "OTP_EXPIRED";
    throw err;
  }

  if (otp.attempts >= otp.maxAttempts) {
    const err = new Error("OTP max attempts exceeded");
    err.statusCode = 400; err.code = "OTP_LOCKED";
    throw err;
  }

  const inputHash = hashOtp({ code, email: session.email });
  if (inputHash !== otp.codeHash) {
    await prisma.signupOtpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const err = new Error("OTP does not match");
    err.statusCode = 400; err.code = "OTP_MISMATCH";
    throw err;
  }

  // tạo user chỉ khi OTP đúng
  const existed = await prisma.user.findUnique({ where: { email: session.email } });
  if (existed) {
    const err = new Error("Email already exists");
    err.statusCode = 409; err.code = "EMAIL_EXISTS";
    throw err;
  }

  const user = await prisma.user.create({
    data: {
      email: session.email,
      passwordHash: session.passwordHash,
      role: "PATIENT",
      fullName: session.fullName,
      phone: session.phone,
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, role: true, fullName: true, phone: true, createdAt: true },
  });

  const accessToken = signAccessToken(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
  );

  const refreshToken = signRefreshToken(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"
  );

  const refreshMaxAgeMs = toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d");
  const refreshExpiresAt = new Date(Date.now() + refreshMaxAgeMs);

  await prisma.$transaction([
    prisma.signupOtpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    prisma.signupSession.update({ where: { id: signupId }, data: { status: "VERIFIED" } }),
    prisma.refreshToken.create({ data: { userId: user.id, tokenHash: sha256(refreshToken), expiresAt: refreshExpiresAt } }),
    prisma.signupSession.delete({ where: { id: signupId } }),
  ]);

  return { user, accessToken, refreshToken, refreshMaxAgeMs };
}