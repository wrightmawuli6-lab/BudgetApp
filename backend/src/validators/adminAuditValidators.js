import { z } from "zod";

export const adminAuditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional()
});
