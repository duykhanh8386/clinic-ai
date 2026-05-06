import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

function extractAccessToken(req) {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const queryToken =
    req.method === "GET" && typeof req.query?.access_token === "string"
      ? req.query.access_token
      : null;
  return bearerToken || queryToken;
}

async function findActiveAuthUser(payload) {
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });

  return user;
}

export async function requireAuth(req, res, next) {
  const token = extractAccessToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing access token" } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await findActiveAuthUser(payload);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid access token" } });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
      });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid access token" } });
  }
}

export async function optionalAuth(req, res, next) {
  const token = extractAccessToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await findActiveAuthUser(payload);
    if (user?.isActive) {
      req.user = { id: user.id, role: user.role };
    }
  } catch {
    // Public endpoints keep working when the optional token is missing or stale.
  }

  next();
}
