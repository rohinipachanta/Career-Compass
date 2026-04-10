/**
 * server/routes-push-additions.ts
 *
 * ADD THESE ROUTES to your existing server/routes.ts file.
 *
 * This file assumes you have:
 *   - A `db` instance (Drizzle ORM) already imported in routes.ts
 *   - A `pushSubscriptions` table (schema below)
 *   - `initPush()` called in server/index.ts at startup
 *
 * ─────────────────────────────────────────────────────────────
 * STEP 1: Add this table to your shared/schema.ts (or db schema file):
 * ─────────────────────────────────────────────────────────────
 *
 * export const pushSubscriptions = pgTable('push_subscriptions', {
 *   id:        serial('id').primaryKey(),
 *   userId:    integer('user_id').notNull(),
 *   endpoint:  text('endpoint').notNull().unique(),
 *   p256dh:    text('p256dh').notNull(),
 *   auth:      text('auth').notNull(),
 *   createdAt: timestamp('created_at').defaultNow(),
 * });
 *
 * ─────────────────────────────────────────────────────────────
 * STEP 2: Add these imports to the top of your routes.ts:
 * ─────────────────────────────────────────────────────────────
 *
 * import { initPush, notifyUser, PushSubscription } from './push';
 * import { pushSubscriptions } from '../shared/schema';  // adjust path
 *
 * ─────────────────────────────────────────────────────────────
 * STEP 3: Call initPush() in server/index.ts:
 * ─────────────────────────────────────────────────────────────
 *
 * import { initPush } from './push';
 * initPush();   // add this near the top, before routes are registered
 *
 * ─────────────────────────────────────────────────────────────
 * STEP 4: Paste the routes below into your registerRoutes() function:
 * ─────────────────────────────────────────────────────────────
 */

// GET /api/push/vapid-public-key
// Returns the VAPID public key so the browser can subscribe.
app.get('/api/push/vapid-public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe
// Saves a new push subscription for the authenticated user.
app.post('/api/push/subscribe', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    // Upsert — avoid duplicates if the browser re-subscribes
    await db
      .insert(pushSubscriptions)
      .values({
        userId:   req.user!.id,
        endpoint,
        p256dh:   keys.p256dh,
        auth:     keys.auth,
      })
      .onConflictDoNothing({ target: pushSubscriptions.endpoint });

    res.json({ ok: true });
  } catch (err) {
    console.error('[push] Subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// DELETE /api/push/unsubscribe
// Removes a push subscription (user turned off notifications).
app.delete('/api/push/unsubscribe', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  res.json({ ok: true });
});

// POST /api/push/test
// Sends a test notification to the current user (for development/debugging).
app.post('/api/push/test', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, req.user!.id));

  if (!subs.length) return res.status(404).json({ error: 'No subscriptions found' });

  const subscriptions: PushSubscription[] = subs.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }));

  const expired = await notifyUser(subscriptions, {
    title: '🏆 WinSync',
    body:  "Test notification — it's working!",
    icon:  '/icon-192.png',
    url:   '/',
  });

  // Clean up expired subscriptions
  if (expired.length) {
    await Promise.all(
      expired.map((endpoint) =>
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
      )
    );
  }

  res.json({ sent: subscriptions.length - expired.length, expired: expired.length });
});
