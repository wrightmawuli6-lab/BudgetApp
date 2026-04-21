import { z } from "zod";

const goalTypeSchema = z.enum(["Short-term", "Long-term"]);

export const createSavingsGoalSchema = z.object({
  title: z.string().min(1).max(120),
  targetAmount: z.number().positive(),
  deadline: z.iso.date(),
  type: goalTypeSchema.optional().default("Short-term"),
  durationMonths: z.number().int().positive().optional()
});

export const updateSavingsGoalSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    targetAmount: z.number().positive().optional(),
    deadline: z.iso.date().optional(),
    type: goalTypeSchema.optional(),
    durationMonths: z.number().int().positive().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field is required");

export const upsertSavingsGoalSchema = z.object({
  targetAmount: z.number().positive(),
  deadline: z.iso.date(),
  title: z.string().min(1).max(120).optional(),
  type: goalTypeSchema.optional(),
  durationMonths: z.number().int().positive().optional()
});

export const addManualSavingsEntrySchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(200).optional().default(""),
  entryDate: z.iso.date().optional()
});
