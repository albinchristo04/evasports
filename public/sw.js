// public/sw.js

self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let payload = { title: 'New Notification', body: 'You have a new update!' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback to text if JSON parsing fails
      payload.body = event.data.text() || 'You have a new update!';
    }
  }

  const title = payload.title || 'SportStream Pro';
  const options = {
    body: payload.body || 'Something new happened!',
    icon: '/logo192.png', // Replace with your actual icon path
    badge: '/logo72.png', // Replace with your actual badge path
    vibrate: [200, 100, 200],
    tag: payload.tag || 'sportstream-notification', // Helps replace old notifications with new ones
    renotify: !!payload.tag, // Re-notify if a tag is present
    data: payload.data || { url: '/' } // Store custom data, like a URL to open
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  // Perform install steps: caching assets, etc.
  // For push notifications, skipping waiting ensures the new SW activates faster if an old one exists.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  // Claim clients immediately to control pages that were loaded with an older SW.
  event.waitUntil(self.clients.claim());
  // Perform activate steps: clean up old caches, etc.
});
