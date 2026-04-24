import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../../db/schema.sql");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to apply the database schema.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function applySchema() {
  const sql = await fs.readFile(schemaPath, "utf8");
  const client = await pool.connect();

  try {
    console.log("Applying database schema...");
    await client.query(sql);
    console.log("Database schema applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema().catch(async (error) => {
  console.error("Failed to apply database schema.", error);
  await pool.end();
  process.exit(1);
});
