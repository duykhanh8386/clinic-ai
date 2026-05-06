import { z } from "zod";

export const chatSessionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createChatSessionSchema = z.object({
  appointmentId: z.string().min(1).optional(),
});

export const createChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  topK: z.coerce.number().int().min(1).max(10).optional().default(5),
});
