import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { withTransaction, query } from "../config/db.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function registerUser(payload) {
  const email = payload.email.trim().toLowerCase();

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows[0]) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const result = await withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [payload.name.trim(), email, passwordHash]
    );

    await client.query(
      `INSERT INTO profiles (user_id, monthly_income, student_type)
       VALUES ($1, $2, $3)`,
      [userResult.rows[0].id, payload.monthlyIncome ?? 0, payload.studentType ?? "full-time"]
    );

    return userResult.rows[0];
  });

  const token = signToken(result);

  return {
    token,
    user: {
      id: result.id,
      name: result.name,
      email: result.email,
      created_at: result.created_at
    }
  };
}

export async function loginUser(payload) {
  const email = payload.email.trim().toLowerCase();

  const userResult = await query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
            p.monthly_income, p.student_type
       FROM users u
       JOIN profiles p ON p.user_id = u.id
      WHERE u.email = $1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(payload.password, user.password_hash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      monthly_income: Number(user.monthly_income),
      student_type: user.student_type,
      created_at: user.created_at
    }
  };
}