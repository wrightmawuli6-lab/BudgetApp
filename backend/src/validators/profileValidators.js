import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().max(255).optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  studentType: z.string().min(2).max(50).optional(),
  debtAmount: z.number().nonnegative().optional()
}).refine((payload) => Object.keys(payload).length > 0, "At least one field is required");