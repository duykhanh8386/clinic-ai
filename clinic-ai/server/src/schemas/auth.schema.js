import { z } from "zod";
import { strongPasswordSchema } from "./password.schema.js";

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: strongPasswordSchema,
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
