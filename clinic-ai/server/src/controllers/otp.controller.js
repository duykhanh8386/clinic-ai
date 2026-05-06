import * as otpService from "../services/otp.service.js";

export async function requestEmailOtp(req, res, next) {
  try {
    const r = await otpService.requestEmailVerifyOtp(req.user.id);
    res.json({ success: true, message: "OTP sent", data: r });
  } catch (e) { next(e); }
}

export async function confirmEmailOtp(req, res, next) {
  try {
    const { code } = req.body;
    const r = await otpService.confirmEmailVerifyOtp(req.user.id, code);
    res.json({ success: true, message: "Email verified", data: r });
  } catch (e) { next(e); }
}