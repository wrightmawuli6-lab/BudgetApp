import { query } from "../config/db.js";

async function getCurrentMonthBase(userId) {
  const result = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1 AND date_trunc('month', income_date) = date_trunc('month', CURRENT_DATE)), 0) AS income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)), 0) AS expenses,
      COALESCE((SELECT target_amount FROM savings_goals WHERE user_id = $1), 0) AS current_goal`,
    [userId]
  );

  const totals = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1), 0) AS all_income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1), 0) AS all_expenses`,
    [userId]
  );

  return {
    income: Number(result.rows[0].income),
    expenses: Number(result.rows[0].expenses),
    currentGoal: Number(result.rows[0].current_goal),
    allIncome: Number(totals.rows[0].all_income),
    allExpenses: Number(totals.rows[0].all_expenses)
  };
}

export async function runBudgetSimulation(userId, input) {
  const base = await getCurrentMonthBase(userId);

  const projectedIncome = base.income + input.hypothetical_income_change;
  const projectedExpenses = base.expenses + input.hypothetical_expense_change;
  const newBalanceProjection = Number((projectedIncome - projectedExpenses).toFixed(2));

  const currentSaved = Math.max(0, base.allIncome - base.allExpenses);
  const remainingToGoal = Math.max(0, input.new_savings_goal - currentSaved);

  let monthsToReachGoal;
  if (newBalanceProjection <= 0) {
    monthsToReachGoal = null;
  } else {
    monthsToReachGoal = Math.ceil(remainingToGoal / newBalanceProjection);
  }

  const ratio = projectedIncome > 0 ? projectedExpenses / projectedIncome : 2;
  const riskLevel = ratio >= 1 || newBalanceProjection <= 0 ? "high" : ratio > 0.8 ? "medium" : "low";

  const result = {
    new_balance_projection: newBalanceProjection,
    months_to_reach_goal: monthsToReachGoal,
    risk_level: riskLevel,
    simulation_summary:
      monthsToReachGoal === null
        ? "Projected balance is non-positive; goal is not reachable under this scenario."
        : `At projected net savings of ${newBalanceProjection.toFixed(2)} per month, you can reach the goal in ${monthsToReachGoal} month(s).`
  };

  await query(
    `INSERT INTO simulations (user_id, input_data, result_data)
     VALUES ($1, $2::jsonb, $3::jsonb)`,
    [userId, JSON.stringify(input), JSON.stringify(result)]
  );

  return result;
}