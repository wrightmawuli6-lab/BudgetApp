import { z } from "zod";

export const aiAnalysisSchema = z.object({
  income: z.number().nonnegative(),
  expenses: z.number().nonnegative(),
  savings_goal: z.object({
    target_amount: z.number().nonnegative(),
    deadline: z.string()
  }).nullable(),
  expense_breakdown: z.record(z.string(), z.number()),
  historical_data: z.object({
    monthly_income: z.array(z.number()),
    monthly_expenses: z.array(z.number()),
    monthly_savings: z.array(z.number())
  })
});

export const simulationSchema = z.object({
  hypothetical_income_change: z.number(),
  hypothetical_expense_change: z.number(),
  new_savings_goal: z.number().positive()
});

export const selectGoalPlanSchema = z.object({
  planKey: z.enum(["A", "B", "C", "D"])
});

export const analyzeGoalRequestSchema = z.object({
  goalId: z.string().uuid(),
  goalName: z.string().min(1),
  targetAmount: z.number().positive(),
  currentSavings: z.number().nonnegative(),
  monthsRemaining: z.number().int().positive(),
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  recentSpending: z.array(z.number().nonnegative()).default([])
});

export const selectBudgetStrategySchema = z.object({
  goalId: z.string().uuid(),
  strategy: z.object({
    strategyName: z.string().min(1),
    monthlySavingsRequired: z.number().nonnegative(),
    description: z.string().default(""),
    spendingAdjustments: z.array(z.string()).default([]),
    stepsToFollow: z.array(z.string()).default([]),
    timelineProjection: z.string().default("Not specified")
  })
});
