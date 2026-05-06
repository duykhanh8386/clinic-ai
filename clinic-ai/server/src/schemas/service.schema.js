import { z } from "zod";

export const createServiceSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().int().nonnegative(),
    durationMinutes: z.number().int().positive(),
    specialtyId: z.string().min(1).optional(),
    specialty: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.specialtyId || data.specialty, {
    message: "Specialty is required",
    path: ["specialty"],
  });

export const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative().optional(),
  durationMinutes: z.number().int().positive().optional(),
  specialtyId: z.string().min(1).optional(),
  specialty: z.string().trim().min(1).optional(),
});
