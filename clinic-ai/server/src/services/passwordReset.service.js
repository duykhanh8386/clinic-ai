import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateOtp6, hashOtp } from "../utils/otp.js";
import { sendEmailOtp } from "../utils/mailer.sendgrid.js";

function minutes(n) {
  return n * 60 * 1000;
}

function otpTtlMs() {
  return minutes(Number(process.env.OTP_TTL_MINUTES || 5));
}

function resetSessionTtlMs() {
  return minutes(Number(process.env.PASSWORD_RESET_SESSION_TTL_MINUTES || 30));
}

function resendCooldownMs() {
  return Number(process.env.OTP_RESEND_COOLDOWN_SEC || 60) * 1000;
}

function maxAttempts() {
  return Number(process.env.OTP_MAX_ATTEMPTS || 5);
}

function buildResetOtpHash(code, email) {
  return hashOtp({
    code,
    target: email,
    purpose: "RESET_PASSWORD",
  });
}

async function getResetSessionOrThrow(resetId) {
  const session = await prisma.passwordResetSession.findUnique({
    where: { id: resetId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!session) {
    const err = new Error("Reset session not found");
    err.statusCode = 404;
    err.code = "RESET_SESSION_NOT_FOUND";
    throw err;
  }

  if (session.expiresAt <= new Date()) {
    const err = new Error("Reset session expired");
    err.statusCode = 400;
    err.code = "RESET_SESSION_EXPIRED";
    throw err;
  }

  if (session.consumedAt) {
    const err = new Error("Reset session already used");
    err.statusCode = 400;
    err.code = "RESET_SESSION_USED";
    throw err;
  }

  if (!session.user.emailVerifiedAt) {
    const err = new Error("Email chưa được xác thực. Vui lòng xác thực email trước khi đổi mật khẩu.");
    err.statusCode = 403;
    err.code = "EMAIL_NOT_VERIFIED";
    throw err;
  }

  return session;
}

async function createAndSendResetOtp({ userId, email }) {
  const code = generateOtp6();

  await prisma.otpCode.create({
    data: {
      userId,
      channel: "EMAIL",
      purpose: "RESET_PASSWORD",
      target: email,
      codeHash: buildResetOtpHash(code, email),
      expiresAt: new Date(Date.now() + otpTtlMs()),
      maxAttempts: maxAttempts(),
    },
  });

  await sendEmailOtp({ to: email, code });

  return {
    otpExpiresInSec: Math.floor(otpTtlMs() / 1000),
    resendAfterSec: Math.floor(resendCooldownMs() / 1000),
  };
}

export async function requestPasswordReset({ email }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    const err = new Error("Email not found");
    err.statusCode = 404;
    err.code = "EMAIL_NOT_FOUND";
    throw err;
  }

  if (!user.emailVerifiedAt) {
    const err = new Error("Email chưa được xác thực. Vui lòng xác thực email trước khi đổi mật khẩu.");
    err.statusCode = 403;
    err.code = "EMAIL_NOT_VERIFIED";
    throw err;
  }

  const session = await prisma.$transaction(async (tx) => {
    await tx.otpCode.updateMany({
      where: {
        userId: user.id,
        purpose: "RESET_PASSWORD",
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await tx.passwordResetSession.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    return tx.passwordResetSession.create({
      data: {
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + resetSessionTtlMs()),
      },
      select: {
        id: true,
        email: true,
      },
    });
  });

  const otpInfo = await createAndSendResetOtp({
    userId: user.id,
    email: user.email,
  });

  return {
    resetId: session.id,
    email: session.email,
    ...otpInfo,
  };
}

export async function resendPasswordResetOtp({ resetId }) {
  const session = await getResetSessionOrThrow(resetId);

  const lastOtp = await prisma.otpCode.findFirst({
    where: {
      userId: session.userId,
      purpose: "RESET_PASSWORD",
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp) {
    const delta = Date.now() - lastOtp.createdAt.getTime();
    if (delta < resendCooldownMs()) {
      const retryAfterSec = Math.ceil((resendCooldownMs() - delta) / 1000);
      const err = new Error(`Please wait ${retryAfterSec}s before resend`);
      err.statusCode = 429;
      err.code = "OTP_RESEND_COOLDOWN";
      err.retryAfterSec = retryAfterSec;
      throw err;
    }
  }

  await prisma.otpCode.updateMany({
    where: {
      userId: session.userId,
      purpose: "RESET_PASSWORD",
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const otpInfo = await createAndSendResetOtp({
    userId: session.userId,
    email: session.email,
  });

  return {
    resetId: session.id,
    email: session.email,
    ...otpInfo,
  };
}

export async function verifyPasswordResetOtp({ resetId, code }) {
  const session = await getResetSessionOrThrow(resetId);

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: session.userId,
      purpose: "RESET_PASSWORD",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    const err = new Error("OTP not found or expired");
    err.statusCode = 400;
    err.code = "OTP_EXPIRED";
    throw err;
  }

  if (otp.attempts >= otp.maxAttempts) {
    const err = new Error("OTP max attempts exceeded");
    err.statusCode = 400;
    err.code = "OTP_LOCKED";
    throw err;
  }

  if (buildResetOtpHash(code, session.email) !== otp.codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const err = new Error("OTP does not match");
    err.statusCode = 400;
    err.code = "OTP_MISMATCH";
    throw err;
  }

  await prisma.$transaction([
    prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetSession.update({
      where: { id: resetId },
      data: { verifiedAt: new Date() },
    }),
  ]);

  return { ok: true, resetId };
}

export async function confirmPasswordReset({ resetId, password, confirmPassword }) {
  if (password !== confirmPassword) {
    const err = new Error("Confirm password does not match");
    err.statusCode = 400;
    err.code = "PASSWORD_CONFIRM_MISMATCH";
    throw err;
  }

  const session = await getResetSessionOrThrow(resetId);

  if (!session.verifiedAt) {
    const err = new Error("OTP must be verified before resetting password");
    err.statusCode = 400;
    err.code = "RESET_NOT_VERIFIED";
    throw err;
  }

  const sameAsOldPassword = await bcrypt.compare(password, session.user.passwordHash);
  if (sameAsOldPassword) {
    const err = new Error("New password must be different from current password");
    err.statusCode = 400;
    err.code = "PASSWORD_SAME_AS_OLD";
    throw err;
  }

  const nextPasswordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: nextPasswordHash,
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: session.userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    }),
    prisma.passwordResetSession.update({
      where: { id: resetId },
      data: { consumedAt: now },
    }),
    prisma.otpCode.updateMany({
      where: {
        userId: session.userId,
        purpose: "RESET_PASSWORD",
        usedAt: null,
      },
      data: { usedAt: now },
    }),
  ]);

  return { ok: true };
}
