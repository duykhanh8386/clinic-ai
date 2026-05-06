import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { signupStartSchema, signupResendSchema, signupVerifySchema } from "../schemas/signup.schema.js";
import * as ctrl from "../controllers/signup.controller.js";

const router = Router();

router.post("/auth/signup/start", validateBody(signupStartSchema), ctrl.start);
router.post("/auth/signup/resend", validateBody(signupResendSchema), ctrl.resend);
router.post("/auth/signup/verify", validateBody(signupVerifySchema), ctrl.verify);

export default router;