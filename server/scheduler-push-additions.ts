/**
 * server/scheduler-push-additions.ts
 *
 * ADD THESE scheduled jobs to your existing server/scheduler.ts.
 *
 * This uses node-cron (check if it's already in your package.json,
 * otherwise: npm install node-cron @types/node-cron).
 *
 * ─────────────────────────────────────────────────────────────
 * Add these imports to the top of your scheduler.ts:
 * ─────────────────────────────────────────────────────────────
 *
 * import cron from 'node-cron';
 * import { db } from './db';
 * import { pushSubscriptions, users, wins } from '../shared/schema';
 * import { notifyUser, PushSubscription } from './push';
 * import { eq, and, gte, sql } from 'drizzle-orm';
 * import dayjs from 'dayjs';
 */

/**
 * Helper: get all push subscriptions for a user.
 */
async function getUserSubscriptions(userId: number): Promise<PushSubscription[]> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return subs.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }));
}

/**
 * Helper: clean up expired subscriptions returned by notifyUser().
 */
async function cleanExpired(endpoints: string[]) {
  await Promise.all(
    endpoints.map((endpoint) =>
      db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    )
  );
}

/**
 * SCHEDULE 1 — Weekly "log your wins" reminder
 * Fires every Monday at 9am.
 * Skips users who already logged something in the past 7 days.
 */
export function scheduleWeeklyReminder() {
  cron.schedule('0 9 * * 1', async () => {
    console.log('[scheduler] Running weekly win reminder...');

    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

    // Get all users who have at least one push subscription
    const allSubs = await db.select({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
    const userIds = [...new Set(allSubs.map((s) => s.userId))];

    for (const userId of userIds) {
      // Check if they've logged a win in the past 7 days
      const recentWins = await db
        .select()
        .from(wins)
        .where(and(eq(wins.userId, userId), gte(wins.createdAt, sevenDaysAgo)))
        .limit(1);

      if (recentWins.length > 0) continue; // Already active — skip

      const subscriptions = await getUserSubscriptions(userId);
      const expired = await notifyUser(subscriptions, {
        title: '🏆 WinSync — Log a Win',
        body:  "It's been a week — anything worth capturing? Even small wins add up.",
        icon:  '/icon-192.png',
        url:   '/?action=log',
      });
      await cleanExpired(expired);
    }
  });
}

/**
 * SCHEDULE 2 — Review countdown alerts
 * Fires every morning at 8am.
 * Sends alerts at 30 days, 7 days, and 1 day before the user's review date.
 */
export function scheduleReviewCountdown() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[scheduler] Running review countdown check...');

    const today = dayjs();
    const alertDays = [30, 7, 1];

    // Get users who have a nextReviewDate set
    const usersWithReview = await db
      .select()
      .from(users)
      .where(sql`${users.nextReviewDate} IS NOT NULL`);

    for (const user of usersWithReview) {
      if (!user.nextReviewDate) continue;

      const reviewDate  = dayjs(user.nextReviewDate);
      const daysUntil   = reviewDate.diff(today, 'day');

      if (!alertDays.includes(daysUntil)) continue;

      // Count their wins for context
      const winCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(wins)
        .where(eq(wins.userId, user.id));

      const count = winCount[0]?.count ?? 0;
      const dayLabel = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

      const subscriptions = await getUserSubscriptions(user.id);
      const expired = await notifyUser(subscriptions, {
        title: `📅 Review ${dayLabel}`,
        body:  `You have ${count} win${count !== 1 ? 's' : ''} logged. Head to Review Mode to prep.`,
        icon:  '/icon-192.png',
        url:   '/?tab=review',
      });
      await cleanExpired(expired);
    }
  });
}

/**
 * Call this in your scheduler.ts initialisation function to activate both schedules.
 *
 * Example — add to your existing initScheduler() or equivalent:
 *
 *   scheduleWeeklyReminder();
 *   scheduleReviewCountdown();
 */
