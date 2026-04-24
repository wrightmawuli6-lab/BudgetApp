import { apiClient } from "./apiClient";
import type {
  BudgetStrategy,
  CoachingPlanKey,
  GoalAnalysisResponse,
  GoalCoachAnalysis,
  GoalCoachPlanSelection,
  GoalStrategy
} from "../types";

export interface DashboardPayload {
  month?: string;
}

export interface SimulationInput {
  hypothetical_income_change: number;
  hypothetical_expense_change: number;
  new_savings_goal: number;
}

export async function getDashboard(payload: DashboardPayload = {}) {
  const response = await apiClient.get("/dashboard", {
    params: payload
  });
  return response.data;
}

export async function getAiFinancialAnalysis() {
  const response = await apiClient.post("/ai/coach-insight", {});
  return response.data;
}

export async function getCoachInsight(input: {
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryBreakdown: Record<string, number>;
  recentTransactions: Array<{ id: string; category: string; description: string; amount: number; date: string }>;
  activeStrategy?: { strategyName: string; monthlySavingsRequired: number; description: string } | null;
}) {
  const response = await apiClient.post("/ai/coach-insight", input);
  return response.data;
}

export async function analyzeGoal(input: {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentSavings: number;
  monthsRemaining: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentSpending: number[];
}) {
  const response = await apiClient.post<GoalAnalysisResponse>("/goals/analyze", input);
  return response.data;
}

export async function selectGoalStrategy(goalId: string, strategy: GoalStrategy) {
  const response = await apiClient.post<{ strategy: BudgetStrategy }>("/strategies/save", {
    goalId,
    strategyName: strategy.strategyName,
    monthlySavingsRequired: strategy.monthlySavingsRequired,
    description: strategy.description,
    spendingAdjustments: strategy.spendingAdjustments,
    stepsToFollow: strategy.stepsToFollow,
    timelineProjection: strategy.timelineProjection
  });
  return response.data;
}

export async function getBudgetStrategies() {
  const response = await apiClient.get<BudgetStrategy[]>("/strategies/history");
  return response.data;
}

export async function getBudgetStrategy(strategyId: string) {
  const response = await apiClient.get<BudgetStrategy>(`/strategies/history/${strategyId}`);
  return response.data;
}

export async function saveSelectedStrategy(input: {
  goalId: string;
  goalName: string;
  strategyName: string;
  monthlySavingsRequired: number;
  description: string;
  spendingAdjustments: string[];
  stepsToFollow: string[];
  timelineProjection: string;
}) {
  const response = await apiClient.post<{ message: string; strategy: BudgetStrategy }>("/strategies/save", input);
  return response.data;
}

export async function getStrategyHistory() {
  const response = await apiClient.get<BudgetStrategy[]>("/strategies/history");
  return response.data;
}

export async function getGoalCoachAnalysis(goalId: string) {
  const response = await apiClient.post<GoalCoachAnalysis>(`/ai/analyze-goal/${goalId}`, {});
  return response.data;
}

export async function selectGoalCoachPlan(goalId: string, planKey: CoachingPlanKey) {
  const response = await apiClient.post<GoalCoachPlanSelection>(`/ai/select-plan/${goalId}`, { planKey });
  return response.data;
}

export async function compareBudgets(month1: string, month2: string) {
  const response = await apiClient.get("/budget/compare", { params: { month1, month2 } });
  return response.data;
}

export async function simulateBudget(input: SimulationInput) {
  const response = await apiClient.post("/budget/simulate", input);
  return response.data;
}
