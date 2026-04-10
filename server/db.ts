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
    await client.query(`
      ALTER TABLE achievements
        ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP;
    `);
    // Review draft auto-save
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS review_draft TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS review_draft_updated_at TIMESTAMP;
    `);
    // Seasons table for review-cycle archives
    await client.query(`
      CREATE TABLE IF NOT EXISTS seasons (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        review_content TEXT,
        archived_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Season foreign key on achievements
    await client.query(`
      ALTER TABLE achievements
        ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id);
    `);
    // Profile fields on users
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS career_journey TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS team TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS company TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_context TEXT;
    `);
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP;
    `);
    // Goals table for user objectives
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        archived_at TIMESTAMP,
        season_id INTEGER REFERENCES seasons(id)
      );
    `);
    // Achievement-Goal mapping (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievement_goals (
        achievement_id INTEGER NOT NULL REFERENCES achievements(id),
        goal_id INTEGER NOT NULL REFERENCES goals(id),
        PRIMARY KEY (achievement_id, goal_id)
      );
    `);
    // Push notification subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[db] Migrations applied.");
  } catch (err: any) {
    // Log clearly but don't throw — startup continues even if migration fails.
    // IMPORTANT: if this fails, add the column manually in Supabase SQL Editor:
    //   ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_reminder boolean NOT NULL DEFAULT false;
    console.error("[db] Migration error (add column manually if login/register breaks):", err?.message ?? err);
  } finally {
    client.release();
  }
}
