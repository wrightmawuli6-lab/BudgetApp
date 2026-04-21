import { query } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { monthBounds } from "../utils/dateUtils.js";

export async function addExpense(userId, payload) {
  const date = payload.expenseDate || new Date().toISOString().slice(0, 10);
  const result = await query(
    `INSERT INTO expenses (user_id, category, description, amount, expense_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, category, description, amount, expense_date, created_at`,
    [userId, payload.category, payload.description || "", payload.amount, date]
  );

  const row = result.rows[0];
  return { ...row, amount: Number(row.amount) };
}

export async function editExpense(userId, expenseId, payload) {
  const current = await query("SELECT id FROM expenses WHERE id = $1 AND user_id = $2", [expenseId, userId]);
  if (!current.rows[0]) {
    throw new ApiError(404, "Expense entry not found");
  }

  const updates = [];
  const values = [];
  let i = 1;

  if (payload.category !== undefined) {
    updates.push(`category = $${i++}`);
    values.push(payload.category);
  }
  if (payload.description !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(payload.description);
  }
  if (payload.amount !== undefined) {
    updates.push(`amount = $${i++}`);
    values.push(payload.amount);
  }
  if (payload.expenseDate !== undefined) {
    updates.push(`expense_date = $${i++}`);
    values.push(payload.expenseDate);
  }

  updates.push(`updated_at = NOW()`);
  values.push(expenseId, userId);

  const result = await query(
    `UPDATE expenses
        SET ${updates.join(", ")}
      WHERE id = $${i++} AND user_id = $${i}
      RETURNING id, category, description, amount, expense_date, updated_at`,
    values
  );

  const row = result.rows[0];
  return { ...row, amount: Number(row.amount) };
}

export async function removeExpense(userId, expenseId) {
  const result = await query("DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id", [expenseId, userId]);
  if (!result.rows[0]) {
    throw new ApiError(404, "Expense entry not found");
  }
}

export async function listExpenses(userId, month) {
  let sql = `SELECT id, category, description, amount, expense_date, created_at FROM expenses WHERE user_id = $1`;
  const params = [userId];

  if (month) {
    const bounds = monthBounds(month);
    params.push(bounds.start, bounds.end);
    sql += ` AND expense_date >= $2 AND expense_date < $3`;
  }

  sql += ` ORDER BY expense_date DESC, created_at DESC`;

  const result = await query(sql, params);
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function expenseBreakdownByCategory(userId, month) {
  const bounds = monthBounds(month);
  const result = await query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses
      WHERE user_id = $1 AND expense_date >= $2 AND expense_date < $3
      GROUP BY category
      ORDER BY total DESC`,
    [userId, bounds.start, bounds.end]
  );

  return {
    month: bounds.start.slice(0, 7),
    categories: result.rows.map((row) => ({
      category: row.category,
      total: Number(row.total)
    }))
  };
}