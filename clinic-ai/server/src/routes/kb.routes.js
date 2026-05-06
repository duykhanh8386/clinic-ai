import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadKbExcel } from "../middleware/upload.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  createKbDocumentSchema,
  kbDocumentIdParamSchema,
  listKbDocumentsQuerySchema,
  processKbDocumentSchema,
  updateKbDocumentSchema,
} from "../schemas/kb.schema.js";
import * as kbController from "../controllers/kb.controller.js";

const router = Router();

const adminOnly = [requireAuth, requireRole("ADMIN")];

router.post("/kb/documents", ...adminOnly, validateBody(createKbDocumentSchema), kbController.create);
router.post("/kb/documents/import-excel", ...adminOnly, uploadKbExcel, kbController.importExcel);
router.post(
  "/kb/documents/:id/process",
  ...adminOnly,
  validateParams(kbDocumentIdParamSchema),
  validateBody(processKbDocumentSchema),
  kbController.process
);
router.get("/kb/documents", ...adminOnly, validateQuery(listKbDocumentsQuerySchema), kbController.list);
router.get("/kb/documents/:id", ...adminOnly, validateParams(kbDocumentIdParamSchema), kbController.getById);
router.put(
  "/kb/documents/:id",
  ...adminOnly,
  validateParams(kbDocumentIdParamSchema),
  validateBody(updateKbDocumentSchema),
  kbController.update
);
router.delete("/kb/documents/:id", ...adminOnly, validateParams(kbDocumentIdParamSchema), kbController.remove);

export default router;
