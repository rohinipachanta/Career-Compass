const CACHE_NAME = 'winsync-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push event ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'WinSync', body: event.data.text() };
  }

  const title = payload.title || 'WinSync';
  const body  = payload.body  || '';
  const icon  = payload.icon  || '/winsync-192.png';
  const url   = payload.url   || '/';

  // Keep options minimal — iOS ignores/rejects many advanced options
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
    })
  );
});

// ── Notification click ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
        } else {
          self.clients.openWindow(targetUrl);
        }
      })
  );
});
