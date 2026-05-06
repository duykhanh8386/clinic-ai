import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import {
  passwordResetRequestSchema,
  passwordResetResendSchema,
  passwordResetVerifySchema,
  passwordResetConfirmSchema,
} from "../schemas/passwordReset.schema.js";
import * as ctrl from "../controllers/passwordReset.controller.js";
import { otpRateLimit } from "../middleware/authRateLimit.js";

const router = Router();

router.post("/auth/forgot-password/request", otpRateLimit, validateBody(passwordResetRequestSchema), ctrl.request);
router.post("/auth/forgot-password/resend", otpRateLimit, validateBody(passwordResetResendSchema), ctrl.resend);
router.post("/auth/forgot-password/verify", otpRateLimit, validateBody(passwordResetVerifySchema), ctrl.verify);
router.post("/auth/forgot-password/reset", validateBody(passwordResetConfirmSchema), ctrl.reset);

export default router;
