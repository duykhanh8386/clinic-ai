import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const adminStatsQuerySchema = z.object({
  from: z.string().regex(dateOnly, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(dateOnly, "to must be YYYY-MM-DD").optional(),
});
