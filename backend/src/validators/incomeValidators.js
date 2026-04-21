import { z } from "zod";

export const createIncomeSchema = z.object({
  source: z.string().min(1).max(120),
  amount: z.number().positive(),
  incomeDate: z.iso.date().optional()
});

export const updateIncomeSchema = z.object({
  source: z.string().min(1).max(120).optional(),
  amount: z.number().positive().optional(),
  incomeDate: z.iso.date().optional()
}).refine((payload) => Object.keys(payload).length > 0, "At least one field is required");