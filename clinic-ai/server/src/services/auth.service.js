import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { sha256 } from "../utils/tokenHash.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { env } from "../config/env.js";

function toMs(expiresIn) {
  // '15m', '7d' => ms
  const unit = expiresIn.slice(-1);
  const num = Number(expiresIn.slice(0, -1));
  if (unit === "m") return num * 60 * 1000;
  if (unit === "h") return num * 60 * 60 * 1000;
  if (unit === "d") return num * 24 * 60 * 60 * 1000;
  // fallback seconds string
  return num * 1000;
}

export async function register({ email, password, fullName, phone }) {
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) {
    const err = new Error("Email already exists");
    err.statusCode = 409;
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: "PATIENT", fullName, phone },
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

  const expiresAt = new Date(Date.now() + toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha256(refreshToken), expiresAt },
  });

  return { user, accessToken, refreshToken, refreshMaxAgeMs: toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    err.code = "AUTH_INVALID";
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    err.code = "AUTH_INVALID";
    throw err;
  }

  if (!user.isActive) {
    const err = new Error("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
    err.statusCode = 403;
    err.code = "ACCOUNT_INACTIVE";
    throw err;
  }

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

  const expiresAt = new Date(Date.now() + toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha256(refreshToken), expiresAt },
  });

  const safeUser = {
    id: user.id, email: user.email, role: user.role, fullName: user.fullName, phone: user.phone,
  };

  return { user: safeUser, accessToken, refreshToken, refreshMaxAgeMs: toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") };
}

export async function refresh(refreshToken) {
  if (!refreshToken) {
    const err = new Error("Missing refresh token");
    err.statusCode = 401;
    err.code = "REFRESH_MISSING";
    throw err;
  }

  let payload;
  try {
    payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    err.code = "REFRESH_INVALID";
    throw err;
  }

  const userId = payload.sub;
  const tokenHash = sha256(refreshToken);

  const tokenRow = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt <= new Date()) {
    const err = new Error("Refresh token expired/revoked");
    err.statusCode = 401;
    err.code = "REFRESH_REVOKED";
    throw err;
  }

  // rotate: revoke old
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    err.code = "AUTH_INVALID";
    throw err;
  }

  if (!user.isActive) {
    const err = new Error("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
    err.statusCode = 403;
    err.code = "ACCOUNT_INACTIVE";
    throw err;
  }

  const newAccessToken = signAccessToken(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
  );

  const newRefreshToken = signRefreshToken(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"
  );

  const expiresAt = new Date(Date.now() + toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha256(newRefreshToken), expiresAt },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, refreshMaxAgeMs: toMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;

  const tokenHash = sha256(refreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (row && !row.revokedAt) {
    await prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
}
