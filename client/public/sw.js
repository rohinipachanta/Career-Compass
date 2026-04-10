/**
 * client/public/sw.js
 *
 * WinSync Service Worker — handles push notifications.
 * Place this file at: client/public/sw.js
 *
 * It will be served at: https://your-app.up.railway.app/sw.js
 */

const CACHE_NAME = 'winsync-v1';

// ── Install & Activate ────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push event ────────────────────────────────────────
// Fires when the server sends a push notification.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'WinSync', body: event.data.text() };
  }

  const { title, body, icon = '/icon-192.png', url = '/' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge:   '/icon-192.png',
      tag:     'winsync-notification',   // replaces previous if still visible
      renotify: true,
      data:    { url },
      actions: [
        { action: 'open',    title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
    })
  );
});

// ── Notification click ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(targetUrl);
        } else {
          self.clients.openWindow(targetUrl);
        }
      })
  );
});
