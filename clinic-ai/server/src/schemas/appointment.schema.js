import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const createAppointmentSchema = z.object({
  slotId: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
});

export const appointmentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
  status: z.enum(["PENDING", "CONFIRMED", "DONE", "CANCELED"]).optional(),
  doctorId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  from: z.string().regex(dateOnly, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(dateOnly, "to must be YYYY-MM-DD").optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(["slotStartAt", "createdAt"]).default("slotStartAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const cancelAppointmentSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newSlotId: z.string().min(1),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "DONE", "CANCELED"]),
});