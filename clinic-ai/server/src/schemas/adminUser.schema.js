import { z } from "zod";
import { strongPasswordSchema } from "./password.schema.js";

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: strongPasswordSchema,
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]),
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]),
});

export const adminUpdateDoctorPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Confirm password does not match",
    path: ["confirmPassword"],
  });
