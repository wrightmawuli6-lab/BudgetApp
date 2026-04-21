import { query } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { monthBounds } from "../utils/dateUtils.js";

export async function addIncome(userId, payload) {
  const date = payload.incomeDate || new Date().toISOString().slice(0, 10);
  const result = await query(
    `INSERT INTO incomes (user_id, source, amount, income_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, source, amount, income_date, created_at`,
    [userId, payload.source.trim(), payload.amount, date]
  );

  const row = result.rows[0];
  return { ...row, amount: Number(row.amount) };
}

export async function editIncome(userId, incomeId, payload) {
  const current = await query("SELECT id FROM incomes WHERE id = $1 AND user_id = $2", [incomeId, userId]);
  if (!current.rows[0]) {
    throw new ApiError(404, "Income entry not found");
  }

  const updates = [];
  const values = [];
  let i = 1;

  if (payload.source !== undefined) {
    updates.push(`source = $${i++}`);
    values.push(payload.source.trim());
  }
  if (payload.amount !== undefined) {
    updates.push(`amount = $${i++}`);
    values.push(payload.amount);
  }
  if (payload.incomeDate !== undefined) {
    updates.push(`income_date = $${i++}`);
    values.push(payload.incomeDate);
  }

  updates.push(`updated_at = NOW()`);
  values.push(incomeId, userId);

  const result = await query(
    `UPDATE incomes
        SET ${updates.join(", ")}
      WHERE id = $${i++} AND user_id = $${i}
      RETURNING id, source, amount, income_date, updated_at`,
    values
  );

  const row = result.rows[0];
  return { ...row, amount: Number(row.amount) };
}

export async function removeIncome(userId, incomeId) {
  const result = await query("DELETE FROM incomes WHERE id = $1 AND user_id = $2 RETURNING id", [incomeId, userId]);
  if (!result.rows[0]) {
    throw new ApiError(404, "Income entry not found");
  }
}

export async function listIncome(userId, month) {
  let sql = `SELECT id, source, amount, income_date, created_at FROM incomes WHERE user_id = $1`;
  const params = [userId];

  if (month) {
    const bounds = monthBounds(month);
    params.push(bounds.start, bounds.end);
    sql += ` AND income_date >= $2 AND income_date < $3`;
  }

  sql += ` ORDER BY income_date DESC, created_at DESC`;

  const result = await query(sql, params);
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function monthlyIncomeSummary(userId, month) {
  const bounds = monthBounds(month);
  const result = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM incomes
      WHERE user_id = $1 AND income_date >= $2 AND income_date < $3`,
    [userId, bounds.start, bounds.end]
  );

  return {
    month: bounds.start.slice(0, 7),
    total_income: Number(result.rows[0].total)
  };
}