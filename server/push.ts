/**
 * server/push.ts
 *
 * Push notification service using web-push (VAPID).
 *
 * Setup:
 *   npm install web-push
 *   npm install --save-dev @types/web-push
 *
 * Generate your VAPID keys once by running in terminal:
 *   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"
 * Then add to your .env file:
 *   VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 *   VAPID_EMAIL=mailto:rohini.p.achanta@gmail.com
 */

import webpush from 'web-push';

// Configure VAPID — called once at server startup
export function initPush() {
  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL ?? 'mailto:rohini.p.achanta@gmail.com';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set — push notifications disabled');
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  console.log('[push] Push notifications enabled');
}

export type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;    // path to icon, e.g. '/icon-192.png'
  url?: string;     // URL to open when notification is tapped
};

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/invalid.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — caller should remove it from the DB
      return false;
    }
    console.error('[push] Send error:', err.message);
    return false;
  }
}

/**
 * Send the same notification to all subscriptions for a user.
 * Returns list of expired subscription endpoints to clean up.
 */
export async function notifyUser(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<string[]> {
  const expired: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      const ok = await sendPushNotification(sub, payload);
      if (!ok) expired.push(sub.endpoint);
    })
  );
  return expired;
}
