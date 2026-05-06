import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import * as serviceController from "../controllers/service.controller.js";
import { createServiceSchema, updateServiceSchema } from "../schemas/service.schema.js";

const router = Router();

/**
 * @openapi
 * /services:
 *   get:
 *     summary: List services
 */
router.get("/services", serviceController.list);

/**
 * @openapi
 * /services/{id}:
 *   get:
 *     summary: Get service detail
 */
router.get("/services/:id", serviceController.getById);

/**
 * @openapi
 * /services:
 *   post:
 *     summary: Create service (ADMIN)
 */
router.post(
  "/services",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createServiceSchema),
  serviceController.create
);

/**
 * @openapi
 * /services/{id}:
 *   put:
 *     summary: Update service (ADMIN)
 */
router.put(
  "/services/:id",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(updateServiceSchema),
  serviceController.update
);

/**
 * @openapi
 * /services/{id}:
 *   delete:
 *     summary: Delete service (ADMIN)
 */
router.delete(
  "/services/:id",
  requireAuth,
  requireRole("ADMIN"),
  serviceController.remove
);

export default router;
