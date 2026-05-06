import { z } from "zod";

const appointmentIdParamSchema = z.object({
  id: z.string().min(1),
});

const previsitFormDataSchema = z.object({
  symptoms: z.array(z.string().trim().min(1)).min(1),
  durationDays: z.number().int().min(0).max(365),
  fever: z.boolean(),
  allergies: z.array(z.string().trim().min(1)).default([]),
  medicalHistory: z.array(z.string().trim().min(1)).default([]),
  currentMedications: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().max(2000).optional().default(""),
});

const upsertPrevisitSchema = z.object({
  formData: previsitFormDataSchema,
});

export {
  appointmentIdParamSchema,
  previsitFormDataSchema,
  upsertPrevisitSchema,
};
