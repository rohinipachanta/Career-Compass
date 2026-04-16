/**
 * server/firebase-entry.ts
 *
 * Firebase Functions entry point.
 * Exports the Express app as an HTTPS function and the schedulers
 * as Firebase Scheduled Functions (replaces node-cron).
 */

import express, { type Request, Response, NextFunction } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { runMigrations } from "./db";
import { initPush } from "./push";
import { sendWeeklyReminders, sendMidweekNudges } from "./scheduler";

// ── Express app setup ─────────────────────────────────────────────────────

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// ── Lazy initialization ───────────────────────────────────────────────────
// Firebase Functions can cold-start, so we initialise DB + routes once.

let ready = false;
let readyPromise: Promise<void> | null = null;

async function initialize() {
  try {
    await runMigrations();
  } catch (err: any) {
    console.error("[firebase] Migration failed (non-fatal):", err?.message ?? err);
  }
  // registerRoutes expects an http.Server but only passes it through — safe to mock
  const mockServer = createServer(app);
  await registerRoutes(mockServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  initPush();
  ready = true;
}

// Middleware that waits for initialization before handling any request
app.use(async (_req, _res, next) => {
  if (ready) return next();
  if (!readyPromise) readyPromise = initialize();
  await readyPromise;
  next();
});

// ── Secrets declared so Firebase injects them as env vars ────────────────

const SECRETS = [
  "SESSION_SECRET",
  "GOOGLE_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_EMAIL",
  "ENCRYPTION_KEY",
  "INBOUND_WEBHOOK_SECRET",
  "APP_URL",
] as const;

// ── Firebase HTTPS Function ───────────────────────────────────────────────

export const api = onRequest(
  { region: "us-central1", timeoutSeconds: 60, memory: "512MiB", secrets: [...SECRETS] },
  app
);

// ── Scheduled Functions (replace node-cron) ───────────────────────────────

// Monday 8AM Central — weekly recap
export const weeklyReminder = onSchedule(
  { schedule: "0 8 * * 1", timeZone: "America/Chicago", secrets: [...SECRETS] },
  async () => {
    console.log("[scheduler] Running Monday weekly reminder...");
    await sendWeeklyReminders();
  }
);

// Wednesday 1PM Central — midweek nudge
export const wednesdayNudge = onSchedule(
  { schedule: "0 13 * * 3", timeZone: "America/Chicago", secrets: [...SECRETS] },
  async () => {
    console.log("[scheduler] Running Wednesday nudge...");
    await sendMidweekNudges("Wednesday");
  }
);

// Friday 1PM Central — end-of-week nudge
export const fridayNudge = onSchedule(
  { schedule: "0 13 * * 5", timeZone: "America/Chicago", secrets: [...SECRETS] },
  async () => {
    console.log("[scheduler] Running Friday nudge...");
    await sendMidweekNudges("Friday");
  }
);
