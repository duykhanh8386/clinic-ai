import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  requestEmailOtp, confirmEmailOtp,
} from "../controllers/otp.controller.js";
import { otpRateLimit } from "../middleware/authRateLimit.js";

const router = Router();

router.post("/auth/verify-email/request", requireAuth, otpRateLimit, requestEmailOtp);
router.post("/auth/verify-email/confirm", requireAuth, otpRateLimit, confirmEmailOtp);

export default router;