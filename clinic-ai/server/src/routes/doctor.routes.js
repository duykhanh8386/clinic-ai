import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { uploadAvatar } from "../middleware/upload.js";
import * as doctorController from "../controllers/doctor.controller.js";
import {
  adminCreateDoctorSchema,
  updateDoctorProfileSchema,
  updateDoctorServicesSchema,
  createAvailabilityRangeSchema,
  updateAvailabilityRangeSchema,
  availabilityRangeQuerySchema,
} from "../schemas/doctor.schema.js";

const router = Router();

router.get("/doctors", optionalAuth, doctorController.list);
router.get("/doctors/:id", optionalAuth, doctorController.getById);

router.post(
  "/doctors",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(adminCreateDoctorSchema),
  doctorController.create
);

router.put(
  "/doctors/:id",
  requireAuth,
  requireRole("ADMIN", "DOCTOR"),
  validateBody(updateDoctorProfileSchema),
  doctorController.updateProfile
);

router.put(
  "/doctors/:id/services",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(updateDoctorServicesSchema),
  doctorController.updateServices
);

router.get(
  "/doctors/:id/availability-ranges",
  validateQuery(availabilityRangeQuerySchema),
  doctorController.listAvailabilityRanges
);

router.get(
  "/doctors/:id/availability-ranges/:rangeId",
  doctorController.getAvailabilityRangeById
);

router.post(
  "/doctors/:id/availability-ranges",
  requireAuth,
  requireRole("ADMIN", "DOCTOR"),
  validateBody(createAvailabilityRangeSchema),
  doctorController.createAvailabilityRange
);

router.put(
  "/doctors/:id/availability-ranges/:rangeId",
  requireAuth,
  requireRole("ADMIN", "DOCTOR"),
  validateBody(updateAvailabilityRangeSchema),
  doctorController.updateAvailabilityRange
);

router.delete(
  "/doctors/:id/availability-ranges/:rangeId",
  requireAuth,
  requireRole("ADMIN", "DOCTOR"),
  doctorController.deleteAvailabilityRange
);

router.patch(
  "/doctors/:id/avatar",
  requireAuth,
  requireRole("ADMIN", "DOCTOR"),
  uploadAvatar,
  doctorController.uploadAvatar
);

router.patch(
  "/doctors/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  doctorController.toggleStatus
);

export default router;
