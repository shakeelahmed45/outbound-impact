import api from './api';

// ═══════════════════════════════════════════════════════════
// PUSH NOTIFICATION SERVICE
// Manages: SW registration, push subscription, badge count
// ✅ FIX: Added comprehensive console logging
// ═══════════════════════════════════════════════════════════

let swRegistration = null;

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  console.log(`📱 [Push] Supported: ${supported} | SW: ${'serviceWorker' in navigator} | PushManager: ${'PushManager' in window} | Notification: ${'Notification' in window}`);
  return supported;
};

/**
 * Get current notification permission status
 */
export const getPermissionStatus = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Register service worker (call on app load)
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('📱 [SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    console.log('📱 [SW] ✅ Service worker registered | Scope:', registration.scope);
    console.log('📱 [SW] Active:', !!registration.active, '| Installing:', !!registration.installing, '| Waiting:', !!registration.waiting);

    // Listen for messages from SW (e.g. notification clicks)
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📱 [SW] Message from service worker:', event.data);
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        window.location.href = event.data.url;
      }
    });

    return registration;
  } catch (err) {
    console.error('📱 [SW] ❌ Registration failed:', err.message);
    return null;
  }
};

/**
 * Get the VAPID public key from the server
 */
const getVapidPublicKey = async () => {
  try {
    console.log('📱 [Push] Fetching VAPID public key from /api/push/vapid-public-key...');
    const res = await api.get('/push/vapid-public-key');
    console.log('📱 [Push] VAPID key received:', res.data.publicKey ? res.data.publicKey.slice(0, 20) + '...' : 'EMPTY');
    return res.data.publicKey;
  } catch (err) {
    console.error('📱 [Push] ❌ Failed to get VAPID public key:', err.response?.status, err.response?.data?.message || err.message);
    return null;
  }
};

/**
 * Convert URL-safe base64 to Uint8Array (required by PushManager)
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // Step 1: Request permission
    console.log('📱 [Push] Step 1: Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📱 [Push] Permission result:', permission);
    if (permission !== 'granted') {
      return { success: false, reason: 'denied' };
    }

    // Step 2: Ensure SW is ready
    console.log('📱 [Push] Step 2: Waiting for service worker...');
    const registration = swRegistration || await navigator.serviceWorker.ready;
    console.log('📱 [Push] Service worker ready');

    // Step 3: Get VAPID public key
    console.log('📱 [Push] Step 3: Getting VAPID key...');
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('📱 [Push] ❌ No VAPID key — server may not have VAPID env vars configured');
      return { success: false, reason: 'no_vapid_key' };
    }

    // Step 4: Subscribe via PushManager
    console.log('📱 [Push] Step 4: Creating PushManager subscription...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log('📱 [Push] PushManager subscription created:', subscription.endpoint.slice(0, 60) + '...');

    // Step 5: Send subscription to backend
    console.log('📱 [Push] Step 5: Saving subscription to server...');
    const res = await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
    });
    console.log('📱 [Push] Server response:', res.data);

    if (res.data.status === 'success') {
      console.log('📱 [Push] ✅ Full subscription flow complete!');
      localStorage.setItem('push_subscribed', 'true');
      return { success: true };
    }

    console.error('📱 [Push] ❌ Server returned non-success:', res.data);
    return { success: false, reason: 'server_error' };
  } catch (err) {
    console.error('📱 [Push] ❌ Subscribe failed:', err.message);
    if (err.response) console.error('📱 [Push] Server error:', err.response.status, err.response.data);
    return { success: false, reason: err.message };
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = swRegistration || await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.post('/push/unsubscribe', {
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }

    localStorage.removeItem('push_subscribed');
    clearBadge();
    console.log('📱 [Push] ✅ Unsubscribed');
    return true;
  } catch (err) {
    console.error('📱 [Push] ❌ Unsubscribe failed:', err);
    return false;
  }
};

/**
 * Check if user is currently subscribed
 */
export const isSubscribed = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

/**
 * Update the badge count on the app icon
 */
export const setBadge = (count) => {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_BADGE',
      count,
    });
  }
};

/**
 * Clear the badge count
 */
export const clearBadge = () => {
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' });
  }
};