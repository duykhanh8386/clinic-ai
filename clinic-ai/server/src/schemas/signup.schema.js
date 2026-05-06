import { z } from "zod";
import { strongPasswordSchema } from "./password.schema.js";

export const signupStartSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: strongPasswordSchema,
  phone: z.string().trim().optional(),
});

export const signupVerifySchema = z.object({
  signupId: z.string().min(10),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const signupResendSchema = z.object({
  signupId: z.string().min(10),
});
