import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { loginRateLimit, registerRateLimit } from "../middleware/authRateLimit.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register patient
 */
router.post("/auth/register", registerRateLimit, validateBody(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login
 */
router.post("/auth/login", loginRateLimit, validateBody(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 */
router.post("/auth/refresh", authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout
 */
router.post("/auth/logout", authController.logout);

export default router;