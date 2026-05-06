import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const adminCreateDoctorSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
    phone: z.string().optional().nullable(),
    specialtyId: z.string().min(1).optional(),
    specialty: z.string().trim().min(1).optional(),
    bio: z.string().optional().nullable(),
    serviceIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.specialtyId || data.specialty, {
    message: "Specialty is required",
    path: ["specialty"],
  });

export const updateDoctorProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  specialtyId: z.string().min(1).optional(),
  specialty: z.string().trim().min(1).optional(),
  bio: z.string().optional().nullable(),
});

export const updateDoctorServicesSchema = z.object({
  serviceIds: z.array(z.string()).default([]),
});

export const availabilityRuleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
});

export const createAvailabilityRangeSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  fromDate: z.string().regex(dateRegex),
  toDate: z.string().regex(dateRegex),
  rules: z.array(availabilityRuleItemSchema).min(1),
});

export const updateAvailabilityRangeSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  fromDate: z.string().regex(dateRegex),
  toDate: z.string().regex(dateRegex),
  rules: z.array(availabilityRuleItemSchema).min(1),
});

export const availabilityRangeQuerySchema = z.object({
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
});
