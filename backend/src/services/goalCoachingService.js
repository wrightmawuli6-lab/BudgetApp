import { query, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { getSavingsGoalById } from "./savingsGoalService.js";

async function ensureCoachingPlanTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS coaching_plan_selections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_id UUID NOT NULL REFERENCES savings_goal_items(id) ON DELETE CASCADE,
      plan_key TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      monthly_savings_target NUMERIC(12, 2) NOT NULL CHECK (monthly_savings_target >= 0),
      recommended_monthly_budget NUMERIC(12, 2) NOT NULL CHECK (recommended_monthly_budget >= 0),
      estimated_completion_date DATE,
      projected_completion_months INT,
      recommended_reductions JSONB NOT NULL DEFAULT '[]'::jsonb,
      analysis_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_coaching_plan_selections_goal_selected
      ON coaching_plan_selections(goal_id, selected_at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_coaching_plan_selections_user_selected
      ON coaching_plan_selections(user_id, selected_at DESC)`
  );
}

function toNumber(value) {
  return Number(Number(value) || 0);
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function getGoalCoachingSnapshot(userId, goalId) {
  await ensureCoachingPlanTable();

  const [goal, profileResult, monthlyHistoryResult, breakdownResult, weeklyResult, recurringBillsResult, selectedPlanResult] = await Promise.all([
    getSavingsGoalById(userId, goalId),
    query(`SELECT monthly_income FROM profiles WHERE user_id = $1`, [userId]),
    query(
      `WITH months AS (
        SELECT to_char(date_trunc('month', d), 'YYYY-MM') AS month
        FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') d
      )
      SELECT
        m.month,
        COALESCE(i.total_income, 0) AS extra_income,
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
    ),
    query(
      `SELECT category::text AS category,
              ROUND((SUM(amount) / GREATEST(COUNT(DISTINCT date_trunc('month', expense_date)), 1))::numeric, 2) AS monthly_average
         FROM expenses
        WHERE user_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY category
        ORDER BY monthly_average DESC`,
      [userId]
    ),
    query(
      `WITH weeks AS (
        SELECT date_trunc('week', d)::date AS week_start
        FROM generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks', date_trunc('week', CURRENT_DATE), INTERVAL '1 week') d
      )
      SELECT
        to_char(w.week_start, 'YYYY-MM-DD') AS week_start,
        COALESCE(e.total, 0) AS total
      FROM weeks w
      LEFT JOIN (
        SELECT date_trunc('week', expense_date)::date AS week_start, SUM(amount) AS total
        FROM expenses
        WHERE user_id = $1
          AND expense_date >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks'
        GROUP BY 1
      ) e ON e.week_start = w.week_start
      ORDER BY w.week_start`,
      [userId]
    ),
    query(
      `SELECT
        COALESCE(NULLIF(description, ''), category::text) AS label,
        category::text AS category,
        ROUND(AVG(amount)::numeric, 2) AS average_amount
       FROM expenses
      WHERE user_id = $1
        AND expense_date >= CURRENT_DATE - INTERVAL '120 days'
      GROUP BY COALESCE(NULLIF(description, ''), category::text), category
      HAVING COUNT(DISTINCT date_trunc('month', expense_date)) >= 2
      ORDER BY average_amount DESC
      LIMIT 5`,
      [userId]
    ),
    query(
      `SELECT plan_key
         FROM coaching_plan_selections
        WHERE user_id = $1 AND goal_id = $2
        ORDER BY selected_at DESC
        LIMIT 1`,
      [userId, goalId]
    )
  ]);

  const profile = profileResult.rows[0];
  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  const baseMonthlyIncome = toNumber(profile.monthly_income);
  const monthlyHistory = monthlyHistoryResult.rows.map((row) => {
    const extraIncome = toNumber(row.extra_income);
    const expenses = toNumber(row.expenses);
    return {
      month: row.month,
      extra_income: extraIncome,
      expenses,
      savings: toNumber(baseMonthlyIncome + extraIncome - expenses)
    };
  });

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      target_amount: toNumber(goal.target_amount),
      current_saved: toNumber(goal.current_saved),
      deadline: goal.deadline
    },
    base_monthly_income: baseMonthlyIncome,
    average_extra_income: Number(average(monthlyHistory.map((row) => row.extra_income)).toFixed(2)),
    average_monthly_expenses: Number(average(monthlyHistory.map((row) => row.expenses)).toFixed(2)),
    expense_breakdown: breakdownResult.rows.map((row) => ({
      category: row.category,
      monthly_average: toNumber(row.monthly_average)
    })),
    weekly_spending: weeklyResult.rows.map((row) => ({
      week_start: row.week_start,
      total: toNumber(row.total)
    })),
    recurring_bills: recurringBillsResult.rows.map((row) => `${row.label} (${row.category})`),
    savings_history: monthlyHistory,
    selected_plan_key: selectedPlanResult.rows[0]?.plan_key || null
  };
}

export async function selectGoalCoachingPlan(userId, goalId, analysis, plan) {
  await ensureCoachingPlanTable();

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO coaching_plan_selections (
        user_id,
        goal_id,
        plan_key,
        plan_name,
        monthly_savings_target,
        recommended_monthly_budget,
        estimated_completion_date,
        projected_completion_months,
        recommended_reductions,
        analysis_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
      [
        userId,
        goalId,
        plan.plan_key,
        plan.plan_name,
        plan.monthly_savings_target,
        plan.recommended_monthly_budget,
        plan.estimated_completion_date,
        plan.estimated_completion_months,
        JSON.stringify(plan.recommended_expense_reductions),
        JSON.stringify(analysis)
      ]
    );

    await client.query(
      `UPDATE profiles
          SET monthly_income = $1,
              updated_at = NOW()
        WHERE user_id = $2`,
      [plan.recommended_monthly_budget, userId]
    );

    const notificationMessage = `${plan.plan_name} plan activated for ${analysis.goal.title}. Save ${plan.monthly_savings_target.toFixed(2)} each month to stay on course.`;

    await client.query(
      `INSERT INTO notification_events (user_id, notification_type, message)
       VALUES ($1, $2, $3)`,
      [userId, "coach_plan_selected", notificationMessage]
    );

    const updatedProfileResult = await client.query(
      `SELECT monthly_income FROM profiles WHERE user_id = $1`,
      [userId]
    );

    return {
      selected_plan_key: plan.plan_key,
      notification_message: notificationMessage,
      updated_profile: {
        monthly_income: toNumber(updatedProfileResult.rows[0]?.monthly_income)
      }
    };
  });
}
