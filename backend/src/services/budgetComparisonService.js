import { query } from "../config/db.js";
import { monthBounds } from "../utils/dateUtils.js";

async function summaryForMonth(userId, month) {
  const bounds = monthBounds(month);
  const result = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1 AND income_date >= $2 AND income_date < $3), 0) AS income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= $2 AND expense_date < $3), 0) AS expenses`,
    [userId, bounds.start, bounds.end]
  );

  const categories = await query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses
      WHERE user_id = $1 AND expense_date >= $2 AND expense_date < $3
      GROUP BY category`,
    [userId, bounds.start, bounds.end]
  );

  return {
    month: bounds.start.slice(0, 7),
    income: Number(result.rows[0].income),
    expenses: Number(result.rows[0].expenses),
    categories: categories.rows.reduce((acc, row) => {
      acc[row.category] = Number(row.total);
      return acc;
    }, {})
  };
}

export async function compareBudgetMonths(userId, month1, month2) {
  const [m1, m2] = await Promise.all([summaryForMonth(userId, month1), summaryForMonth(userId, month2)]);

  const m1Savings = m1.income - m1.expenses;
  const m2Savings = m2.income - m2.expenses;

  const categories = new Set([...Object.keys(m1.categories), ...Object.keys(m2.categories)]);
  const categoryChanges = [...categories].map((category) => ({
    category,
    month1: m1.categories[category] || 0,
    month2: m2.categories[category] || 0,
    difference: (m2.categories[category] || 0) - (m1.categories[category] || 0)
  }));

  return {
    month1: m1.month,
    month2: m2.month,
    income_difference: Number((m2.income - m1.income).toFixed(2)),
    expense_difference: Number((m2.expenses - m1.expenses).toFixed(2)),
    savings_difference: Number((m2Savings - m1Savings).toFixed(2)),
    category_changes: categoryChanges,
    improvement_or_decline: m2Savings >= m1Savings ? "improved" : "declined"
  };
}