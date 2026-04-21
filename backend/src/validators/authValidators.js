import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  monthlyIncome: z.number().nonnegative().default(0),
  studentType: z.string().min(2).max(50).default("full-time")
});

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(128)
});