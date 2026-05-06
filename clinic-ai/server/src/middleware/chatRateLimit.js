import { createHttpError } from "../utils/httpError.js";

const bucket = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

export function chatRateLimit(req, _res, next) {
  const key = req.user?.id || req.ip || "unknown";
  const now = Date.now();

  const state = bucket.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + WINDOW_MS;
  }

  state.count += 1;
  bucket.set(key, state);

  if (state.count > MAX_REQUESTS) {
    return next(
      createHttpError(
        429,
        "CHAT_RATE_LIMITED",
        "Too many chat requests, please retry after a short delay"
      )
    );
  }

  next();
}
