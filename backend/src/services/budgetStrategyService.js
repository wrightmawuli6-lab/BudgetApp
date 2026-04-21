import { query } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

async function ensureBudgetStrategiesTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS budget_strategies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_id UUID NOT NULL REFERENCES savings_goal_items(id) ON DELETE CASCADE,
      strategy_name TEXT NOT NULL,
      monthly_savings_required NUMERIC(12, 2) NOT NULL CHECK (monthly_savings_required >= 0),
      description TEXT NOT NULL,
      spending_adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
      steps_to_follow JSONB NOT NULL DEFAULT '[]'::jsonb,
      timeline_projection TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_budget_strategies_user_created
      ON budget_strategies(user_id, created_at DESC)`
  );
}

export async function saveBudgetStrategy(userId, goalId, strategy) {
  await ensureBudgetStrategiesTable();
  const result = await query(
    `INSERT INTO budget_strategies (
      user_id,
      goal_id,
      strategy_name,
      monthly_savings_required,
      description,
      spending_adjustments,
      steps_to_follow,
      timeline_projection
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
    RETURNING *`,
    [
      userId,
      goalId,
      strategy.strategyName,
      strategy.monthlySavingsRequired,
      strategy.description,
      JSON.stringify(strategy.spendingAdjustments),
      JSON.stringify(strategy.stepsToFollow),
      strategy.timelineProjection
    ]
  );

  return result.rows[0];
}

export async function getBudgetStrategies(userId) {
  await ensureBudgetStrategiesTable();
  const result = await query(
    `SELECT
      bs.*,
      sg.title as goal_title,
      sg.target_amount as goal_target_amount
    FROM budget_strategies bs
    JOIN savings_goal_items sg ON bs.goal_id = sg.id
    WHERE bs.user_id = $1
    ORDER BY bs.created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    goalId: row.goal_id,
    goalName: row.goal_title,
    strategyName: row.strategy_name,
    monthlySavingsRequired: Number(row.monthly_savings_required),
    description: row.description,
    spendingAdjustments: row.spending_adjustments,
    stepsToFollow: row.steps_to_follow,
    timelineProjection: row.timeline_projection,
    createdAt: row.created_at
  }));
}

export async function getBudgetStrategyById(userId, strategyId) {
  await ensureBudgetStrategiesTable();
  const result = await query(
    `SELECT
      bs.*,
      sg.title as goal_title,
      sg.target_amount as goal_target_amount
    FROM budget_strategies bs
    JOIN savings_goal_items sg ON bs.goal_id = sg.id
    WHERE bs.id = $1 AND bs.user_id = $2`,
    [strategyId, userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Budget strategy not found");
  }

  const row = result.rows[0];
  return {
    id: row.id,
    goalId: row.goal_id,
    goalName: row.goal_title,
    strategyName: row.strategy_name,
    monthlySavingsRequired: Number(row.monthly_savings_required),
    description: row.description,
    spendingAdjustments: row.spending_adjustments,
    stepsToFollow: row.steps_to_follow,
    timelineProjection: row.timeline_projection,
    createdAt: row.created_at
  };
}
