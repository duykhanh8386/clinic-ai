import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const generateSlotsSchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  rangeId: z.string().min(1),
  // Tùy chọn: chỉ sinh slot cho các rule ID cụ thể (ca làm việc được chọn)
  selectedRuleIds: z.array(z.string().min(1)).optional(),
});

export const listSlotsQuerySchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(dateOnly, "date must be YYYY-MM-DD"),
  status: z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const generateSlotsDirectSchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  fromDate: z.string().regex(dateOnly),
  toDate: z.string().regex(dateOnly),
  rules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .min(1),
});

export const listSlotsByRangeSchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  from: z.string().regex(dateOnly),
  to: z.string().regex(dateOnly),
  status: z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
