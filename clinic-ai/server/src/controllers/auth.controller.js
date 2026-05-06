import * as authService from "../services/auth.service.js";
import { setRefreshCookie, clearRefreshCookie } from "../utils/refreshCookie.js";

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";

export async function register(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body;
    const result = await authService.register({ email, password, fullName, phone });

    setRefreshCookie(res, REFRESH_COOKIE_NAME, result.refreshToken, result.refreshMaxAgeMs);
    res.status(201).json({ success: true, message: "Registered", data: { user: result.user, accessToken: result.accessToken } });
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    setRefreshCookie(res, REFRESH_COOKIE_NAME, result.refreshToken, result.refreshMaxAgeMs);
    res.json({ success: true, message: "Logged in", data: { user: result.user, accessToken: result.accessToken } });
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(token);

    setRefreshCookie(res, REFRESH_COOKIE_NAME, result.refreshToken, result.refreshMaxAgeMs);
    res.json({ success: true, message: "Refreshed", data: { accessToken: result.accessToken } });
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(token);
    clearRefreshCookie(res, REFRESH_COOKIE_NAME);
    res.json({ success: true, message: "Logged out" });
  } catch (e) { next(e); }
}