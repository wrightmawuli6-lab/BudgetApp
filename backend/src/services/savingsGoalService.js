import { query } from "../config/db.js";
import { daysBetween } from "../utils/dateUtils.js";
import { ApiError } from "../utils/ApiError.js";

async function ensureSavingsGoalTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS savings_goal_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Savings Goal',
      goal_type TEXT NOT NULL DEFAULT 'Short-term',
      target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
      deadline DATE NOT NULL,
      duration_months INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_savings_goal_items_user_created
      ON savings_goal_items(user_id, created_at DESC)`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS savings_goal_manual_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_id UUID REFERENCES savings_goal_items(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      note TEXT NOT NULL DEFAULT '',
      entry_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await query(
    `ALTER TABLE savings_goal_manual_entries
      ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES savings_goal_items(id) ON DELETE CASCADE`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_savings_goal_manual_entries_user_date
      ON savings_goal_manual_entries(user_id, entry_date)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_savings_goal_manual_entries_goal
      ON savings_goal_manual_entries(goal_id, entry_date)`
  );
}

function monthsFromDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

async function getUserNetSavings(userId) {
  const totals = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM incomes WHERE user_id = $1), 0) AS total_income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1), 0) AS total_expenses`,
    [userId]
  );

  const totalIncome = Number(totals.rows[0].total_income);
  const totalExpenses = Number(totals.rows[0].total_expenses);
  return totalIncome - totalExpenses;
}

async function computeGoalProgress(goalRow) {
  const totalManualResult = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM savings_goal_manual_entries
      WHERE goal_id = $1`,
    [goalRow.id]
  );

  const netSavings = await getUserNetSavings(goalRow.user_id);
  const manualContributions = Number(totalManualResult.rows[0].total);
  const currentSaved = Math.max(0, netSavings + manualContributions);
  const targetAmount = Number(goalRow.target_amount);
  const remainingAmount = Math.max(0, targetAmount - currentSaved);
  const durationMonths = Number(goalRow.duration_months) || monthsFromDates(new Date().toISOString(), goalRow.deadline);
  const monthsLeft = Math.max(1, daysBetween(new Date().toISOString(), goalRow.deadline) / 30);
  const progressPercent = targetAmount > 0 ? Math.min(100, (currentSaved / targetAmount) * 100) : 0;
  const requiredMonthlySavings = remainingAmount / monthsLeft;

  return {
    id: goalRow.id,
    title: goalRow.title,
    type: goalRow.goal_type,
    duration_months: durationMonths,
    target_amount: targetAmount,
    deadline: goalRow.deadline,
    required_monthly_savings: Number(requiredMonthlySavings.toFixed(2)),
    current_progress_percent: Number(progressPercent.toFixed(2)),
    remaining_amount: Number(remainingAmount.toFixed(2)),
    current_saved: Number(currentSaved.toFixed(2)),
    manual_contributions: Number(manualContributions.toFixed(2))
  };
}

export async function listSavingsGoals(userId) {
  await ensureSavingsGoalTables();
  const result = await query(
    `SELECT id, user_id, title, goal_type, target_amount, deadline, duration_months, created_at, updated_at
       FROM savings_goal_items
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId]
  );
  const goals = await Promise.all(result.rows.map((row) => computeGoalProgress(row)));
  return goals;
}

export async function upsertSavingsGoal(userId, payload) {
  await ensureSavingsGoalTables();
  const goals = await listSavingsGoals(userId);
  if (goals[0]) {
    return updateSavingsGoal(userId, goals[0].id, payload);
  }
  return createSavingsGoal(userId, payload);
}

export async function createSavingsGoal(userId, payload) {
  await ensureSavingsGoalTables();
  const result = await query(
    `INSERT INTO savings_goal_items (user_id, title, goal_type, target_amount, deadline, duration_months)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, goal_type, target_amount, deadline, duration_months, created_at, updated_at`,
    [
      userId,
      payload.title || "Savings Goal",
      payload.type || "Short-term",
      payload.targetAmount,
      payload.deadline,
      payload.durationMonths ?? monthsFromDates(new Date().toISOString(), payload.deadline)
    ]
  );
  return computeGoalProgress(result.rows[0]);
}

export async function updateSavingsGoal(userId, goalId, payload) {
  await ensureSavingsGoalTables();
  const current = await query("SELECT id FROM savings_goal_items WHERE id = $1 AND user_id = $2", [goalId, userId]);
  if (!current.rows[0]) {
    throw new ApiError(404, "Savings goal not found");
  }

  const updates = [];
  const values = [];
  let i = 1;
  if (payload.title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(payload.title.trim());
  }
  if (payload.type !== undefined) {
    updates.push(`goal_type = $${i++}`);
    values.push(payload.type);
  }
  if (payload.targetAmount !== undefined) {
    updates.push(`target_amount = $${i++}`);
    values.push(payload.targetAmount);
  }
  if (payload.deadline !== undefined) {
    updates.push(`deadline = $${i++}`);
    values.push(payload.deadline);
  }
  if (payload.durationMonths !== undefined) {
    updates.push(`duration_months = $${i++}`);
    values.push(payload.durationMonths);
  }
  updates.push(`updated_at = NOW()`);
  values.push(goalId, userId);

  const result = await query(
    `UPDATE savings_goal_items
        SET ${updates.join(", ")}
      WHERE id = $${i++} AND user_id = $${i}
      RETURNING id, user_id, title, goal_type, target_amount, deadline, duration_months, created_at, updated_at`,
    values
  );
  return computeGoalProgress(result.rows[0]);
}

export async function getSavingsGoal(userId) {
  const goals = await listSavingsGoals(userId);
  return goals[0] || null;
}

export async function getSavingsGoalById(userId, goalId) {
  await ensureSavingsGoalTables();
  const result = await query(
    `SELECT id, user_id, title, goal_type, target_amount, deadline, duration_months, created_at, updated_at
       FROM savings_goal_items
      WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "Savings goal not found");
  }

  return computeGoalProgress(result.rows[0]);
}

export async function addManualSavingsEntry(userId, goalId, payload) {
  await ensureSavingsGoalTables();
  const goal = await query(
    "SELECT id, user_id, title, goal_type, target_amount, deadline, duration_months, created_at, updated_at FROM savings_goal_items WHERE id = $1 AND user_id = $2",
    [goalId, userId]
  );
  if (!goal.rows[0]) {
    throw new ApiError(404, "Savings goal not found");
  }

  const entryDate = payload.entryDate || new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO savings_goal_manual_entries (user_id, goal_id, amount, note, entry_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, goalId, payload.amount, payload.note ?? "", entryDate]
  );

  return computeGoalProgress(goal.rows[0]);
}
