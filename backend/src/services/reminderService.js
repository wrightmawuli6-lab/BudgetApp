import { query } from "../config/db.js";

export async function runDailyReminderCheck() {
  const result = await query(
    `SELECT u.id, u.email, u.name
       FROM users u
      WHERE NOT EXISTS (
        SELECT 1
          FROM expenses e
         WHERE e.user_id = u.id
           AND e.expense_date = CURRENT_DATE
      )`
  );

  const notifications = [];

  for (const row of result.rows) {
    const message = `Hi ${row.name}, you have not logged any expense today. Keep your budget tracking streak active.`;
    await query(
      `INSERT INTO notification_events (user_id, notification_type, message)
       VALUES ($1, $2, $3)`,
      [row.id, "daily_expense_reminder", message]
    );

    notifications.push({
      user_id: row.id,
      email: row.email,
      message
    });
  }

  return notifications;
}