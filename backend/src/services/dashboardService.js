import { query } from "../config/db.js";
import { monthBounds } from "../utils/dateUtils.js";
import { getSavingsGoal } from "./savingsGoalService.js";

export async function getDashboardData(userId, month) {
  const bounds = monthBounds(month);

  const totalsResult = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1 AND income_date >= $2 AND income_date < $3), 0) AS total_income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= $2 AND expense_date < $3), 0) AS total_expenses`,
    [userId, bounds.start, bounds.end]
  );

  const breakdownResult = await query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses
      WHERE user_id = $1 AND expense_date >= $2 AND expense_date < $3
      GROUP BY category`,
    [userId, bounds.start, bounds.end]
  );

  const totalIncome = Number(totalsResult.rows[0].total_income);
  const totalExpenses = Number(totalsResult.rows[0].total_expenses);
  const balance = Number((totalIncome - totalExpenses).toFixed(2));
  const savingsGoal = await getSavingsGoal(userId);

  const currentBudgetStatus = balance >= 0 ? "on_track" : "overspent";

  return {
    month: bounds.start.slice(0, 7),
    total_income: totalIncome,
    total_expenses: totalExpenses,
    balance,
    savings_progress: savingsGoal
      ? {
          current_progress_percent: savingsGoal.current_progress_percent,
          remaining_amount: savingsGoal.remaining_amount
        }
      : null,
    expense_breakdown_by_category: breakdownResult.rows.reduce((acc, row) => {
      acc[row.category] = Number(row.total);
      return acc;
    }, {}),
    current_budget_status: currentBudgetStatus
  };
}