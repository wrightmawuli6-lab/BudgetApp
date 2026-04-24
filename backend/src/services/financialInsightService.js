import { query } from "../config/db.js";

export async function saveFinancialInsight(userId, healthScore, advice) {
  await query(
    `INSERT INTO financial_insights (user_id, health_score, advice)
     VALUES ($1, $2, $3::jsonb)`,
    [userId, healthScore, JSON.stringify(advice)]
  );
}