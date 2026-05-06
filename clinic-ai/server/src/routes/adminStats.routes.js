import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateQuery } from "../middleware/validate.js";
import { adminStatsQuerySchema } from "../schemas/adminStats.schema.js";
import * as adminStatsController from "../controllers/adminStats.controller.js";

const router = Router();

router.get(
  "/admin/stats",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(adminStatsQuerySchema),
  adminStatsController.get
);

export default router;
