import { createHttpError } from "../utils/httpError.js";

/**
 * Simple in-process rate limiter cho Auth endpoints.
 * Tách biệt limit theo từng endpoint nhóm:
 *   - login:    10 attempts / 15 minutes per IP
 *   - register: 5  attempts / 60 minutes per IP
 *   - otp/password reset: 5 attempts / 15 minutes per IP
 */

const store = new Map();

function makeRateLimiter({ windowMs, max, errorCode, errorMessage }) {
  return function rateLimitMiddleware(req, _res, next) {
    // Dùng IP thật nếu có reverse proxy (X-Forwarded-For)
    const ip =
      (req.headers["x-forwarded-for"] ?? "")
        .split(",")[0]
        .trim() || req.socket?.remoteAddress || "unknown";

    const key = `${errorCode}:${ip}`;
    const now = Date.now();

    let state = store.get(key);
    if (!state || now > state.resetAt) {
      state = { count: 0, resetAt: now + windowMs };
    }

    state.count += 1;
    store.set(key, state);

    if (state.count > max) {
      const retryAfterSec = Math.ceil((state.resetAt - now) / 1000);
      return next(
        createHttpError(429, errorCode, `${errorMessage}. Thử lại sau ${retryAfterSec}s.`)
      );
    }

    next();
  };
}

// 10 lần / 15 phút cho login
export const loginRateLimit = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  errorCode: "LOGIN_RATE_LIMITED",
  errorMessage: "Quá nhiều lần đăng nhập thất bại",
});

// 5 lần / 60 phút cho register
export const registerRateLimit = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  errorCode: "REGISTER_RATE_LIMITED",
  errorMessage: "Quá nhiều tài khoản được tạo từ địa chỉ này",
});

// 5 lần / 15 phút cho OTP / forgot-password
export const otpRateLimit = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  errorCode: "OTP_RATE_LIMITED",
  errorMessage: "Quá nhiều yêu cầu OTP, vui lòng chờ",
});
