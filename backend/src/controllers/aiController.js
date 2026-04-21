import { query } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { analyzeFinancialData, analyzeGoalPayload, buildGoalCoachingAnalysis } from "../services/aiFinancialService.js";
import { saveFinancialInsight } from "../services/financialInsightService.js";
import { getGoalCoachingSnapshot, selectGoalCoachingPlan } from "../services/goalCoachingService.js";
import { getSavingsGoal, getSavingsGoalById } from "../services/savingsGoalService.js";
import { saveBudgetStrategy, getBudgetStrategies, getBudgetStrategyById } from "../services/budgetStrategyService.js";

async function buildCurrentSnapshot(userId) {
  const [incomeResult, expenseResult, breakdownResult, recentTransactionsResult, profileResult] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = $1`, [userId]),
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1`, [userId]),
    query(`SELECT category, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1 GROUP BY category`, [userId]),
    query(`SELECT id, category, description, amount, expense_date FROM expenses WHERE user_id = $1 ORDER BY expense_date DESC LIMIT 10`, [userId]),
    query(`SELECT monthly_income FROM profiles WHERE user_id = $1`, [userId])
  ]);

  const historical = await query(
    `WITH months AS (
      SELECT to_char(date_trunc('month', d), 'YYYY-MM') AS month
      FROM generate_series(CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE, INTERVAL '1 month') d
    )
    SELECT
      m.month,
      COALESCE(i.total_income, 0) AS income,
      COALESCE(e.total_expenses, 0) AS expenses
    FROM months m
    LEFT JOIN (
      SELECT to_char(date_trunc('month', income_date), 'YYYY-MM') AS month, SUM(amount) AS total_income
      FROM incomes
      WHERE user_id = $1
      GROUP BY 1
    ) i ON i.month = m.month
    LEFT JOIN (
      SELECT to_char(date_trunc('month', expense_date), 'YYYY-MM') AS month, SUM(amount) AS total_expenses
      FROM expenses
      WHERE user_id = $1
      GROUP BY 1
    ) e ON e.month = m.month
    ORDER BY m.month`,
    [userId]
  );

  const savingsGoal = await getSavingsGoal(userId);

  // Get active strategy
  const activeStrategyResult = await query(
    `SELECT bs.* FROM budget_strategies bs
     JOIN savings_goal_items sgi ON bs.goal_id = sgi.id
     WHERE bs.user_id = $1 AND sgi.deadline >= CURRENT_DATE
     ORDER BY bs.created_at DESC LIMIT 1`,
    [userId]
  );

  return {
    monthlyIncome: Number(profileResult.rows[0]?.monthly_income || 0),
    monthlyExpenses: Number(expenseResult.rows[0].total),
    categoryBreakdown: breakdownResult.rows.reduce((acc, row) => {
      acc[row.category] = Number(row.total);
      return acc;
    }, {}),
    recentTransactions: recentTransactionsResult.rows.map(row => ({
      id: row.id,
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      date: row.expense_date
    })),
    activeStrategy: activeStrategyResult.rows[0] ? {
      strategyName: activeStrategyResult.rows[0].strategy_name,
      monthlySavingsRequired: Number(activeStrategyResult.rows[0].monthly_savings_required),
      description: activeStrategyResult.rows[0].description
    } : null,
    savings_goal: savingsGoal
      ? {
          target_amount: savingsGoal.target_amount,
          deadline: savingsGoal.deadline
        }
      : null,
    expense_breakdown: breakdownResult.rows.reduce((acc, row) => {
      acc[row.category] = Number(row.total);
      return acc;
    }, {}),
    historical_data: {
      monthly_income: historical.rows.map((r) => Number(r.income)),
      monthly_expenses: historical.rows.map((r) => Number(r.expenses)),
      monthly_savings: historical.rows.map((r) => Number(r.income) - Number(r.expenses))
    }
  };
}

export async function aiAnalysisController(req, res) {
  const input = req.body?.monthlyIncome !== undefined ? req.body : await buildCurrentSnapshot(req.user.id);
  const goalProgress = input.savings_goal?.target_amount
    ? Math.max(0, Math.min(100, ((input.monthlyIncome - input.monthlyExpenses) / input.savings_goal.target_amount) * 100))
    : 0;

  const insight = await analyzeFinancialData(req.user.id, input, goalProgress);
  await saveFinancialInsight(req.user.id, insight.financial_health_score, insight);

  res.json(insight);
}

export async function coachInsightController(req, res) {
  const input = req.body?.monthlyIncome !== undefined ? req.body : await buildCurrentSnapshot(req.user.id);
  const goalProgress = input.savings_goal?.target_amount
    ? Math.max(0, Math.min(100, ((input.monthlyIncome - input.monthlyExpenses) / input.savings_goal.target_amount) * 100))
    : 0;

  const insight = await analyzeFinancialData(req.user.id, input, goalProgress);
  await saveFinancialInsight(req.user.id, insight.financial_health_score, insight);
  res.json(insight);
}

export async function aiGoalAnalysisController(req, res) {
  const snapshot = await getGoalCoachingSnapshot(req.user.id, req.params.goalId);
  const analysis = buildGoalCoachingAnalysis(snapshot);
  res.json(analysis);
}

export async function analyzeGoalRequestController(req, res) {
  const analysis = analyzeGoalPayload(req.body);
  res.json(analysis);
}

export async function selectGoalPlanController(req, res) {
  const snapshot = await getGoalCoachingSnapshot(req.user.id, req.params.goalId);
  const analysis = buildGoalCoachingAnalysis(snapshot);
  const strategy = analysis.strategies.find((entry) => entry.strategyName.toLowerCase().replace(/\s+/g, '') === req.body.strategyName.toLowerCase().replace(/\s+/g, ''));

  if (!strategy) {
    throw new ApiError(404, "Strategy not found");
  }

  // Save to coaching_plan_selections for backward compatibility
  const plan = analysis.plans?.find((entry) => entry.plan_name === strategy.strategyName);
  if (plan) {
    await selectGoalCoachingPlan(req.user.id, req.params.goalId, analysis, plan);
  }

  // Save to budget_strategies
  const savedStrategy = await saveBudgetStrategy(req.user.id, req.params.goalId, strategy);

  res.json({
    message: "Strategy selected successfully",
    strategy: savedStrategy
  });
}

export async function selectBudgetStrategyController(req, res) {
  const goalId = req.body.goalId;
  await getSavingsGoalById(req.user.id, goalId);

  const strategyInput = req.body.strategy || req.body;
  if (!strategyInput.strategyName) {
    throw new ApiError(400, "strategyName is required");
  }

  const payload = {
    strategyName: strategyInput.strategyName,
    monthlySavingsRequired: Number(strategyInput.monthlySavingsRequired || 0),
    description: strategyInput.description || "",
    spendingAdjustments: Array.isArray(strategyInput.spendingAdjustments) ? strategyInput.spendingAdjustments : [],
    stepsToFollow: Array.isArray(strategyInput.stepsToFollow) ? strategyInput.stepsToFollow : [],
    timelineProjection: strategyInput.timelineProjection || "Not specified"
  };

  const savedStrategy = await saveBudgetStrategy(req.user.id, goalId, payload);
  res.status(201).json({
    message: "Strategy selected successfully",
    strategy: savedStrategy
  });
}

export async function getBudgetStrategiesController(req, res) {
  const strategies = await getBudgetStrategies(req.user.id);
  res.json(strategies);
}

export async function getBudgetStrategyController(req, res) {
  const strategy = await getBudgetStrategyById(req.user.id, req.params.strategyId);
  res.json(strategy);
}
