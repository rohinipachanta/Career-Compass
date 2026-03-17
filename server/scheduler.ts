import cron from "node-cron";
import { db } from "./db";
import { users, achievements } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { sendWeeklyReminderEmail } from "./email";

/**
 * Schedules the weekly reminder email.
 * Runs every Monday at 8:00 AM UTC (4 AM ET / 1 AM PT).
 * Cron format: minute hour day-of-month month day-of-week
 */
export function startScheduler() {
  // "0 8 * * 1" = every Monday at 08:00 UTC
  cron.schedule("0 8 * * 1", async () => {
    console.log("[scheduler] Running weekly reminder job...");
    await sendWeeklyReminders();
  });

  console.log("[scheduler] Weekly reminder cron registered (Mondays 08:00 UTC)");
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
