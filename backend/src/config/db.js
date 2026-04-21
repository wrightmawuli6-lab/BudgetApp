import { Pool } from "pg";
import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error", err);
});

function normalizeDbError(error) {
  if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND" || error?.code === "ETIMEDOUT") {
    return new ApiError(
      503,
      "Database connection failed. Ensure PostgreSQL is running and DATABASE_URL is correct."
    );
  }

  if (!error?.message && error?.code) {
    return new ApiError(500, `Database error (${error.code})`);
  }

  return error;
}

export async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    throw normalizeDbError(error);
  }
}

export async function withTransaction(callback) {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // no-op: rollback may fail when connection itself is unavailable
      }
    }
    throw normalizeDbError(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}
