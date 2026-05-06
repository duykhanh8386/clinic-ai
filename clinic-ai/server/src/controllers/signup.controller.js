import * as signupService from "../services/signup.service.js";
import { setRefreshCookie } from "../utils/refreshCookie.js";

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";

export async function start(req, res, next) {
  try {
    const r = await signupService.signupStart(req.body);
    res.json({ success: true, message: "OTP sent", data: r });
  } catch (e) { next(e); }
}

export async function resend(req, res, next) {
  try {
    const r = await signupService.signupResend(req.body);
    res.json({ success: true, message: "OTP resent", data: r });
  } catch (e) { next(e); }
}

export async function verify(req, res, next) {
  try {
    const r = await signupService.signupVerify(req.body);
    setRefreshCookie(res, REFRESH_COOKIE_NAME, r.refreshToken, r.refreshMaxAgeMs);
    res.json({ success: true, message: "Verified", data: { user: r.user, accessToken: r.accessToken } });
  } catch (e) { next(e); }
}