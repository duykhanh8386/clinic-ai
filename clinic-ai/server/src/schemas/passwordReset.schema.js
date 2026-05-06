import { z } from "zod";
import { strongPasswordSchema } from "./password.schema.js";

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
});

export const passwordResetResendSchema = z.object({
  resetId: z.string().min(10),
});

export const passwordResetVerifySchema = z.object({
  resetId: z.string().min(10),
  code: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const passwordResetConfirmSchema = z
  .object({
    resetId: z.string().min(10),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirm password does not match",
      });
    }
  });
