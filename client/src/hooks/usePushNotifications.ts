/**
 * client/src/hooks/usePushNotifications.ts
 *
 * React hook that handles the full push notification subscription flow:
 *  1. Registers the service worker
 *  2. Fetches the VAPID public key from your server
 *  3. Subscribes the browser to push notifications
 *  4. POSTs the subscription to your server to save it
 *
 * Usage in a component:
 *
 *   const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
 *
 *   <button onClick={subscribe} disabled={!isSupported || isSubscribed}>
 *     Enable Notifications
 *   </button>
 */

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  // Register the service worker on mount
  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        setRegistration(reg);
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setStatus('subscribed');
        } else if (Notification.permission === 'denied') {
          setStatus('denied');
        } else {
          setStatus('unsubscribed');
        }
      })
      .catch((err) => {
        console.error('[push] SW registration failed:', err);
        setStatus('unsupported');
      });
  }, [isSupported]);

  /**
   * Ask the user for permission and subscribe to push notifications.
   */
  const subscribe = useCallback(async () => {
    if (!registration) return;
    setStatus('loading');

    try {
      // 1. Get VAPID public key from server
      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await keyRes.json();

      // 2. Subscribe browser
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 3. Send subscription to server
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(subscription),
      });

      setStatus('subscribed');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || Notification.permission === 'denied') {
        setStatus('denied');
      } else {
        console.error('[push] Subscribe failed:', err);
        setStatus('unsubscribed');
      }
    }
  }, [registration]);

  /**
   * Unsubscribe from push notifications.
   */
  const unsubscribe = useCallback(async () => {
    if (!registration) return;
    setStatus('loading');

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await fetch('/api/push/unsubscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: existing.endpoint }),
      });
      await existing.unsubscribe();
    }
    setStatus('unsubscribed');
  }, [registration]);

  /**
   * Send yourself a test notification (dev only).
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert('Test failed: ' + (data.error ?? res.statusText));
        return false;
      } else if (data.sent === 0) {
        alert('Notification expired — try disabling and re-enabling notifications.');
        return false;
      }
      return true;
    } catch (err: any) {
      alert('Test failed: ' + err.message);
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed:  status === 'subscribed',
    isDenied:      status === 'denied',
    isLoading:     status === 'loading',
    status,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
