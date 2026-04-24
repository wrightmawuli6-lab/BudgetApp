import { query, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export async function getProfile(userId) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.created_at,
            p.monthly_income, p.student_type, p.debt_amount
       FROM users u
       JOIN profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  );

  const profile = result.rows[0];
  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    monthly_income: Number(profile.monthly_income),
    student_type: profile.student_type,
    debt_amount: Number(profile.debt_amount),
    created_at: profile.created_at
  };
}

export async function updateProfile(userId, payload) {
  return withTransaction(async (client) => {
    if (payload.name || payload.email) {
      const updates = [];
      const values = [];
      let i = 1;

      if (payload.name) {
        updates.push(`name = $${i++}`);
        values.push(payload.name.trim());
      }
      if (payload.email) {
        const normalized = payload.email.trim().toLowerCase();
        const dup = await client.query("SELECT id FROM users WHERE email = $1 AND id <> $2", [normalized, userId]);
        if (dup.rows[0]) {
          throw new ApiError(409, "Email already in use");
        }
        updates.push(`email = $${i++}`);
        values.push(normalized);
      }

      values.push(userId);
      await client.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`, values);
    }

    const profileUpdates = [];
    const profileValues = [];
    let j = 1;

    if (payload.monthlyIncome !== undefined) {
      profileUpdates.push(`monthly_income = $${j++}`);
      profileValues.push(payload.monthlyIncome);
    }
    if (payload.studentType !== undefined) {
      profileUpdates.push(`student_type = $${j++}`);
      profileValues.push(payload.studentType);
    }
    if (payload.debtAmount !== undefined) {
      profileUpdates.push(`debt_amount = $${j++}`);
      profileValues.push(payload.debtAmount);
    }

    if (profileUpdates.length > 0) {
      profileUpdates.push(`updated_at = NOW()`);
      profileValues.push(userId);
      await client.query(`UPDATE profiles SET ${profileUpdates.join(", ")} WHERE user_id = $${j}`, profileValues);
    }

    const profileResult = await client.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              p.monthly_income, p.student_type, p.debt_amount
         FROM users u
         JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1`,
      [userId]
    );

    const profile = profileResult.rows[0];

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      monthly_income: Number(profile.monthly_income),
      student_type: profile.student_type,
      debt_amount: Number(profile.debt_amount),
      created_at: profile.created_at
    };
  });
}