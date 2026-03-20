const SW_VERSION = '1.1.0';

// ─── FETCH: Intercept share target POST from phone share sheet ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept POST requests to /share-receive
  if (event.request.method !== 'POST' || url.pathname !== '/share-receive') return;

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();

      const title   = formData.get('title') || '';
      const text    = formData.get('text')  || '';
      const shareUrl = formData.get('url')  || '';
      const file    = formData.get('media') || null;

      // Build query params to pass text data to the React page
      const params = new URLSearchParams();
      if (title)    params.set('title',    title);
      if (text)     params.set('text',     text);
      if (shareUrl) params.set('url',      shareUrl);

      // Store file in cache so the React page can retrieve it
      if (file) {
        const cache = await caches.open('share-target-v1');
        await cache.put('/share-target-file', new Response(file, {
          headers: { 'Content-Type': file.type, 'X-File-Name': file.name }
        }));
        params.set('hasFile', '1');
        params.set('fileType', file.type);
        params.set('fileName', file.name);
      }

      // Redirect to the share-receive React page with data in query string
      return Response.redirect(`/share-receive?${params.toString()}`, 303);
    } catch (err) {
      console.error('[SW] Share target error:', err);
      return Response.redirect('/share-receive?error=1', 303);
    }
  })());
});

// ─── INSTALL: Activate immediately ───
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

// ─── ACTIVATE: Claim all clients ───
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activated`);
  event.waitUntil(self.clients.claim());
});

// ─── PUSH: Receive push notification from server ───
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Outbound Impact',
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    url: '/dashboard',
    unreadCount: 0,
    tag: 'default',
    category: 'general',
  };

  // Parse the push payload
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Update the badge count on the app icon
  // For campaign pushes: use badge (item count)
  // For dashboard pushes: use unreadCount
  const badgeCount = data.badge || data.unreadCount || 0;
  if (navigator.setAppBadge && badgeCount > 0) {
    navigator.setAppBadge(badgeCount).catch(() => {});
  }

  // Choose icon based on category
  const categoryIcons = {
    campaign_update: '📢',
    new_customer: '👤',
    revenue: '💰',
    churn: '⚠️',
    system: '🔴',
    platform: '🟣',
    upload: '📤',
    view_milestone: '🎉',
    team: '👥',
    storage: '💾',
    account: '🔐',
  };
  const emoji = categoryIcons[data.category] || '🔔';

  // Show the notification popup
  const options = {
    body: data.body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || data.category || 'default',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      notificationId: data.notificationId,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(`${emoji} ${data.title}`, options)
  );
});

// ─── NOTIFICATION CLICK: Open the app ───
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If the app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            notificationId: event.notification.data?.notificationId,
          });
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

// ─── MESSAGE: Handle messages from the app ───
self.addEventListener('message', (event) => {
  const { type, count } = event.data || {};

  if (type === 'SET_BADGE') {
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }

  if (type === 'CLEAR_BADGE') {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }
});