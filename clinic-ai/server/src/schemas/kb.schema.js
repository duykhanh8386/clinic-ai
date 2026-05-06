import { z } from "zod";

export const kbDocumentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createKbDocumentSchema = z.object({
  title: z.string().trim().min(3).max(255),
  type: z.enum(["TEXT", "PDF"]).default("TEXT"),
  content: z.string().trim().min(3).max(200000),
});

export const updateKbDocumentSchema = z.object({
  title: z.string().trim().min(3).max(255),
  content: z.string().trim().min(3).max(200000),
  autoProcess: z.boolean().default(true),
});

export const processKbDocumentSchema = z.object({
  chunkSize: z.coerce.number().int().min(100).max(4000).default(800),
  overlap: z.coerce.number().int().min(0).max(800).default(120),
});

export const listKbDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["PENDING", "PROCESSING", "PROCESSED", "FAILED"]).optional(),
  search: z.string().trim().min(1).optional(),
});
