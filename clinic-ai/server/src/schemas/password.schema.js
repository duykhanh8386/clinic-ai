import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENT_TEXT =
  "Password must be at least 8 characters and include at least 1 number and 1 special character.";

const hasDigit = /\d/;
const hasSpecial = /[^A-Za-z0-9]/;

export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((value) => hasDigit.test(value), {
    message: "Password must include at least 1 number",
  })
  .refine((value) => hasSpecial.test(value), {
    message: "Password must include at least 1 special character",
  });
