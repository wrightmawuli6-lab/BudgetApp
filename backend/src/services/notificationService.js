import { query } from "../config/db.js";

export async function listNotifications(userId, limit = 20) {
  const result = await query(
    `SELECT id, notification_type, message, created_at
       FROM notification_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}