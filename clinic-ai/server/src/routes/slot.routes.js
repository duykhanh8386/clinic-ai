import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import * as slotController from "../controllers/slot.controller.js";
import {
  generateSlotsSchema,
  generateSlotsDirectSchema,
  listSlotsQuerySchema,
  listSlotsByRangeSchema,
} from "../schemas/slot.schema.js";

const router = Router();

router.get("/slots", optionalAuth, validateQuery(listSlotsQuerySchema), slotController.list);
router.get("/slots/range", optionalAuth, validateQuery(listSlotsByRangeSchema), slotController.listByRange);

router.post(
  "/slots/generate",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(generateSlotsSchema),
  slotController.generate
);

router.post(
  "/slots/generate-direct",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(generateSlotsDirectSchema),
  slotController.generateDirect
);

export default router;
