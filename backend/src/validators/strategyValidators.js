import { z } from "zod";

export const saveStrategySchema = z.object({
  goalId: z.string().uuid(),
  goalName: z.string().min(1).optional(),
  strategyName: z.string().min(1),
  monthlySavingsRequired: z.number().nonnegative(),
  description: z.string().default(""),
  spendingAdjustments: z.array(z.string()).default([]),
  stepsToFollow: z.array(z.string()).default([]),
  timelineProjection: z.string().default("Not specified")
});
