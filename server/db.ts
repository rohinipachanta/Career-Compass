import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Run lightweight column migrations on startup
// These are idempotent (IF NOT EXISTS) — safe to run every deploy
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS weekly_reminder boolean NOT NULL DEFAULT false;
    `);
    console.log("[db] Migrations applied.");
  } finally {
    client.release();
  }
}
