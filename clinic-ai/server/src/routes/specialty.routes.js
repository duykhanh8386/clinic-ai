import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import * as specialtyController from "../controllers/specialty.controller.js";
import { createSpecialtySchema, updateSpecialtySchema } from "../schemas/specialty.schema.js";

const router = Router();

router.get("/specialties", specialtyController.list);
router.get("/specialties/:id", specialtyController.getById);

router.post(
  "/specialties",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createSpecialtySchema),
  specialtyController.create
);

router.put(
  "/specialties/:id",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(updateSpecialtySchema),
  specialtyController.update
);

router.delete(
  "/specialties/:id",
  requireAuth,
  requireRole("ADMIN"),
  specialtyController.remove
);

export default router;
