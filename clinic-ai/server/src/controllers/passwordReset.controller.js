import * as passwordResetService from "../services/passwordReset.service.js";

export async function request(req, res, next) {
  try {
    const result = await passwordResetService.requestPasswordReset(req.body);
    res.json({ success: true, message: "OTP sent", data: result });
  } catch (e) {
    next(e);
  }
}

export async function resend(req, res, next) {
  try {
    const result = await passwordResetService.resendPasswordResetOtp(req.body);
    res.json({ success: true, message: "OTP resent", data: result });
  } catch (e) {
    next(e);
  }
}

export async function verify(req, res, next) {
  try {
    const result = await passwordResetService.verifyPasswordResetOtp(req.body);
    res.json({ success: true, message: "OTP verified", data: result });
  } catch (e) {
    next(e);
  }
}

export async function reset(req, res, next) {
  try {
    const result = await passwordResetService.confirmPasswordReset(req.body);
    res.json({ success: true, message: "Password reset successfully", data: result });
  } catch (e) {
    next(e);
  }
}
