import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { appointmentIdParamSchema, upsertPrevisitSchema } from "../schemas/previsit.schema.js";
import * as previsitController from "../controllers/previsit.controller.js";

const router = Router();

router.post(
  "/appointments/:id/previsit",
  requireAuth,
  validateParams(appointmentIdParamSchema),
  validateBody(upsertPrevisitSchema),
  previsitController.upsert
);

router.get(
  "/appointments/:id/previsit",
  requireAuth,
  validateParams(appointmentIdParamSchema),
  previsitController.get
);

export default router;
