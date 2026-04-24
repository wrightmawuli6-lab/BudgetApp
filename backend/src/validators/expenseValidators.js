import { z } from "zod";
import { EXPENSE_CATEGORIES } from "../constants/expenseCategories.js";

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().max(300).optional().default(""),
  amount: z.number().positive(),
  expenseDate: z.iso.date().optional()
});

export const updateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().max(300).optional(),
  amount: z.number().positive().optional(),
  expenseDate: z.iso.date().optional()
}).refine((payload) => Object.keys(payload).length > 0, "At least one field is required");