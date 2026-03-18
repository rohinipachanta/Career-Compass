import cron from "node-cron";
import { db } from "./db";
import { users, achievements } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { sendWeeklyReminderEmail, sendMidweekNudgeEmail } from "./email";

/**
 * All cron jobs run in America/Chicago (Central Time) so 1PM always means
 * 1PM Central regardless of daylight saving time.
 *
 * Monday  08:00 CT — weekly recap (win count for last week)
 * Wednesday 13:00 CT — midweek nudge
 * Friday  13:00 CT — end-of-week nudge
 */
export function startScheduler() {
  // Monday 8AM Central — weekly recap
  cron.schedule("0 8 * * 1", async () => {
    console.log("[scheduler] Running Monday weekly reminder job...");
    await sendWeeklyReminders();
  }, { timezone: "America/Chicago" });

  // Wednesday 1PM Central — midweek nudge
  cron.schedule("0 13 * * 3", async () => {
    console.log("[scheduler] Running Wednesday midweek nudge job...");
    await sendMidweekNudges("Wednesday");
  }, { timezone: "America/Chicago" });

  // Friday 1PM Central — end-of-week nudge
  cron.schedule("0 13 * * 5", async () => {
    console.log("[scheduler] Running Friday end-of-week nudge job...");
    await sendMidweekNudges("Friday");
  }, { timezone: "America/Chicago" });

  console.log("[scheduler] Crons registered: Monday 8AM, Wednesday 1PM, Friday 1PM (all Central Time)");
}

export async function sendWeeklyReminders() {
  try {
    // Get all users who have an email address AND have weekly reminders enabled
    const usersToNotify = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL`,
          sql`${users.email} != ''`,
          eq(users.weeklyReminder, true)
        )
      );

    if (usersToNotify.length === 0) {
      console.log("[scheduler] No users with weekly reminders enabled.");
      return;
    }

    // Calculate the start of the current week (last Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToLastMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    let sent = 0;
    let errors = 0;

    for (const user of usersToNotify) {
      try {
        // Count confirmed wins logged this week
        const weekWins = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(achievements)
          .where(
            and(
              eq(achievements.userId, user.id),
              eq(achievements.isConfirmed, 1),
              gte(achievements.achievementDate, weekStartDate)
            )
          );

        const winCount = weekWins[0]?.count ?? 0;

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
    // Send to all users with an email and weekly reminders enabled
    const usersToNotify = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL`,
          sql`${users.email} != ''`,
          eq(users.weeklyReminder, true)
        )
      );

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
