import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import * as ctrl from "../controllers/appointmentNote.controller.js";

const router = Router();

/**
 * POST /appointments/:id/note
 * Tạo/cập nhật ghi chú sau khám (DOCTOR hoặc ADMIN)
 */
router.post(
  "/appointments/:id/note",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  ctrl.upsert
);

/**
 * GET /appointments/:id/note
 * Lấy ghi chú sau khám (DOCTOR, PATIENT sở hữu, ADMIN)
 */
router.get("/appointments/:id/note", requireAuth, ctrl.get);

export default router;
