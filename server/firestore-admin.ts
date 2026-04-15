/**
 * server/firestore-admin.ts
 *
 * Initialises Firebase Admin SDK and exports the Firestore instance.
 * Works automatically in Firebase Functions (uses Application Default Credentials).
 * For local dev, set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

export const firestore = getFirestore();

/** Convert a Firestore Timestamp (or Date) to a JS Date */
export function toDate(val: Timestamp | Date | undefined | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  return (val as Timestamp).toDate();
}

/** Convert a JS Date to a Firestore Timestamp */
export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}
