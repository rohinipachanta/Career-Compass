/**
 * server/db.ts
 *
 * Stub — database is now Firestore (see server/firestore-admin.ts).
 * This file is kept for import compatibility during the migration.
 */

export async function runMigrations() {
  // No-op: Firestore is schema-less, no migrations needed.
  console.log("[db] Firestore — no migrations needed.");
}

// Legacy exports for any remaining references
export const pool = null as any;
export const db = null as any;
