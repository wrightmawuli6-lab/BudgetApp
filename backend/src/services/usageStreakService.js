import { query } from "../config/db.js";

let ensureUsageStreakTablePromise;

async function ensureUsageStreakTable() {
  if (!ensureUsageStreakTablePromise) {
    ensureUsageStreakTablePromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS user_daily_activity (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_date DATE NOT NULL,
          activity_count INT NOT NULL DEFAULT 1 CHECK (activity_count >= 1),
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, activity_date)
        )`
      );

      await query(
        `CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date
          ON user_daily_activity(user_id, activity_date DESC)`
      );
    })().catch((error) => {
      ensureUsageStreakTablePromise = undefined;
      throw error;
    });
  }

  return ensureUsageStreakTablePromise;
}

const STREAK_COUNT_SQL = `
  WITH ranked AS (
    SELECT
      activity_date,
      CURRENT_DATE - ((ROW_NUMBER() OVER (ORDER BY activity_date DESC) - 1)::int) AS expected_date
    FROM user_daily_activity
    WHERE user_id = $1
      AND activity_date <= CURRENT_DATE
  )
  SELECT COUNT(*)::int AS streak
  FROM ranked
  WHERE activity_date = expected_date
`;

export async function getDailyUsageStreak(userId) {
  await ensureUsageStreakTable();

  const result = await query(STREAK_COUNT_SQL, [userId]);
  return Number(result.rows[0]?.streak ?? 0);
}

export async function recordDailyUsageAndGetStreak(userId) {
  await ensureUsageStreakTable();

  await query(
    `INSERT INTO user_daily_activity (user_id, activity_date, activity_count, first_seen_at, last_seen_at)
     VALUES ($1, CURRENT_DATE, 1, NOW(), NOW())
     ON CONFLICT (user_id, activity_date)
     DO UPDATE SET
       activity_count = user_daily_activity.activity_count + 1,
       last_seen_at = NOW()`,
    [userId]
  );

  return getDailyUsageStreak(userId);
}

function normalizeWindowDays(windowDays) {
  const parsed = Number(windowDays);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 365);
}

function differenceInDays(leftDate, rightDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((leftDate.getTime() - rightDate.getTime()) / millisecondsPerDay);
}

export async function getDailyUsageStreakHistory(userId, windowDays = 30) {
  await ensureUsageStreakTable();

  const safeWindowDays = normalizeWindowDays(windowDays);
  const currentStreak = await getDailyUsageStreak(userId);

  const recentActivityResult = await query(
    `SELECT
        activity_date::text AS date,
        activity_count,
        first_seen_at,
        last_seen_at
      FROM user_daily_activity
      WHERE user_id = $1
        AND activity_date >= CURRENT_DATE - ($2::int - 1)
      ORDER BY activity_date DESC`,
    [userId, safeWindowDays]
  );

  const allActivityResult = await query(
    `SELECT activity_date::text AS date
      FROM user_daily_activity
      WHERE user_id = $1
      ORDER BY activity_date ASC`,
    [userId]
  );

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  for (const row of allActivityResult.rows) {
    const currentDate = new Date(`${row.date}T00:00:00Z`);

    if (!previousDate || differenceInDays(currentDate, previousDate) !== 1) {
      runningStreak = 1;
    } else {
      runningStreak += 1;
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }

    previousDate = currentDate;
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    active_days: recentActivityResult.rows.length,
    window_days: safeWindowDays,
    last_active_date: recentActivityResult.rows[0]?.date ?? null,
    activity: recentActivityResult.rows.map((row) => ({
      date: row.date,
      activity_count: Number(row.activity_count ?? 0),
      first_seen_at: row.first_seen_at,
      last_seen_at: row.last_seen_at
    }))
  };
}
