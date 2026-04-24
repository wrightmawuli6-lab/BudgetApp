import { query } from "../config/db.js";
import { clamp } from "../utils/mathUtils.js";

export async function calculateFinancialHealthScore(userId, goalProgress = 0) {
  const [ratiosResult, consistencyResult, debtResult] = await Promise.all([
    query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1 AND income_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS income_30,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS expenses_30`,
      [userId]
    ),
    query(
      `SELECT COUNT(DISTINCT expense_date) AS tracked_days
         FROM expenses
        WHERE user_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    ),
    query("SELECT debt_amount FROM profiles WHERE user_id = $1", [userId])
  ]);

  const income30 = Number(ratiosResult.rows[0].income_30);
  const expenses30 = Number(ratiosResult.rows[0].expenses_30);
  const savingsRate = income30 > 0 ? clamp((income30 - expenses30) / income30, -1, 1) : 0;
  const expenseRatio = income30 > 0 ? clamp(expenses30 / income30, 0, 2) : 1;
  const consistency = clamp(Number(consistencyResult.rows[0].tracked_days) / 30, 0, 1);

  const debtAmount = Number(debtResult.rows[0]?.debt_amount || 0);
  const debtRatio = income30 > 0 ? clamp(debtAmount / income30, 0, 2) : debtAmount > 0 ? 2 : 0;

  const savingsRateScore = clamp((savingsRate + 0.2) / 1.2, 0, 1) * 30;
  const expenseRatioScore = clamp(1 - (expenseRatio - 0.6) / 0.8, 0, 1) * 25;
  const consistencyScore = consistency * 15;
  const debtScore = clamp(1 - debtRatio / 1.5, 0, 1) * 15;
  const goalScore = clamp(goalProgress / 100, 0, 1) * 15;

  const score = clamp(Math.round(savingsRateScore + expenseRatioScore + consistencyScore + debtScore + goalScore), 0, 100);

  return {
    score,
    metrics: {
      savings_rate: Number(savingsRate.toFixed(4)),
      expense_to_income_ratio: Number(expenseRatio.toFixed(4)),
      consistency: Number(consistency.toFixed(4)),
      debt_ratio: Number(debtRatio.toFixed(4)),
      goal_progress_rate: Number(clamp(goalProgress / 100, 0, 1).toFixed(4))
    }
  };
}