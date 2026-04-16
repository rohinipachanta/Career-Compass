/**
 * server/scheduler.ts
 *
 * Scheduled job logic — called by Firebase scheduled functions in firebase-entry.ts.
 * node-cron is no longer used; scheduling is handled by Firebase onSchedule.
 */

import { firestore } from "./firestore-admin";
import { sendWeeklyReminderEmail, sendMidweekNudgeEmail } from "./email";
import type { User } from "@shared/schema";

/** No-op in Firebase — scheduling is handled by firebase-entry.ts onSchedule exports */
export function startScheduler() {
  console.log("[scheduler] Running on Firebase — cron jobs managed by Firebase Functions.");
}

export async function sendWeeklyReminders() {
  try {
    const snapshot = await firestore
      .collection("users")
      .where("weeklyReminder", "==", true)
      .get();

    const usersToNotify = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as User))
      .filter(u => u.email && u.email.trim() !== "");

    if (usersToNotify.length === 0) {
      console.log("[scheduler] No users with weekly reminders enabled.");
      return;
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToLastMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    let sent = 0;
    let errors = 0;

    for (const user of usersToNotify) {
      try {
        const achSnap = await firestore
          .collection("users")
          .doc(user.id)
          .collection("achievements")
          .where("isConfirmed", "==", 1)
          .where("achievementDate", ">=", weekStartDate)
          .get();

        const winCount = achSnap.size;

        await sendWeeklyReminderEmail(user.email!, user.username, winCount);
        sent++;
      } catch (err) {
        console.error(`[scheduler] Error sending to user ${user.id}:`, err);
        errors++;
      }
    }

    console.log(`[scheduler] Weekly reminders done. Sent: ${sent}, Errors: ${errors}`);
  } catch (err) {
    console.error("[scheduler] Fatal error in sendWeeklyReminders:", err);
  }
}

export async function sendMidweekNudges(day: "Wednesday" | "Friday") {
  try {
    const snapshot = await firestore
      .collection("users")
      .where("weeklyReminder", "==", true)
      .get();

    const usersToNotify = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as User))
      .filter(u => u.email && u.email.trim() !== "");

    if (usersToNotify.length === 0) {
      console.log(`[scheduler] No users for ${day} nudge.`);
      return;
    }

    let sent = 0;
    let errors = 0;

    for (const user of usersToNotify) {
      try {
        await sendMidweekNudgeEmail(user.email!, user.username, day);
        sent++;
      } catch (err) {
        console.error(`[scheduler] Error sending ${day} nudge to user ${user.id}:`, err);
        errors++;
      }
    }

    console.log(`[scheduler] ${day} nudges done. Sent: ${sent}, Errors: ${errors}`);
  } catch (err) {
    console.error(`[scheduler] Fatal error in sendMidweekNudges (${day}):`, err);
  }
}
