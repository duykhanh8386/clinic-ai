import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import * as appointmentController from "../controllers/appointment.controller.js";
import {
  appointmentIdParamSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../schemas/appointment.schema.js";

const router = Router();

router.get("/appointments", requireAuth, validateQuery(listAppointmentsQuerySchema), appointmentController.list);

router.get(
  "/appointments/stream",
  requireAuth,
  requireRole("DOCTOR", "PATIENT"),
  appointmentController.stream
);

router.post(
  "/appointments",
  requireAuth,
  requireRole("PATIENT"),
  validateBody(createAppointmentSchema),
  appointmentController.create
);

router.get(
  "/appointments/:id",
  requireAuth,
  validateParams(appointmentIdParamSchema),
  appointmentController.getById
);

router.post(
  "/appointments/:id/cancel",
  requireAuth,
  requireRole("PATIENT", "ADMIN"),
  validateParams(appointmentIdParamSchema),
  validateBody(cancelAppointmentSchema),
  appointmentController.cancel
);

router.post(
  "/appointments/:id/reschedule",
  requireAuth,
  requireRole("PATIENT", "ADMIN"),
  validateParams(appointmentIdParamSchema),
  validateBody(rescheduleAppointmentSchema),
  appointmentController.reschedule
);

router.patch(
  "/appointments/:id/status",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validateParams(appointmentIdParamSchema),
  validateBody(updateAppointmentStatusSchema),
  appointmentController.updateStatus
);

export default router;
