import api from './api';

// ═══════════════════════════════════════════════════════════
// PUSH NOTIFICATION SERVICE
// Manages: SW registration, push subscription, badge count
// ═══════════════════════════════════════════════════════════

let swRegistration = null;

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Get current notification permission status
 * Returns: 'granted' | 'denied' | 'default'
 */
export const getPermissionStatus = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Register service worker (call on app load)
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    console.log('✅ Service worker registered');

    // Listen for messages from SW (e.g. notification clicks)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        window.location.href = event.data.url;
      }
    });

    return registration;
  } catch (err) {
    console.error('❌ Service worker registration failed:', err);
    return null;
  }
};

/**
 * Get the VAPID public key from the server
 */
const getVapidPublicKey = async () => {
  try {
    const res = await api.get('/push/vapid-public-key');
    return res.data.publicKey;
  } catch (err) {
    console.error('Failed to get VAPID public key:', err);
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
 * 1. Request notification permission
 * 2. Subscribe via PushManager
 * 3. Send subscription to backend
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    console.warn('Push not supported');
    return { success: false, reason: 'unsupported' };
  }

  try {
    // Step 1: Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return { success: false, reason: 'denied' };
    }

    // Step 2: Ensure SW is ready
    const registration = swRegistration || await navigator.serviceWorker.ready;

    // Step 3: Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, reason: 'no_vapid_key' };
    }

    // Step 4: Subscribe via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Step 5: Send subscription to backend
    const res = await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
    });

    if (res.data.status === 'success') {
      console.log('✅ Push subscription saved');
      // Store that user has subscribed
      localStorage.setItem('push_subscribed', 'true');
      return { success: true };
    }

    return { success: false, reason: 'server_error' };
  } catch (err) {
    console.error('Push subscription failed:', err);
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
      // Tell backend to remove subscription
      await api.post('/push/unsubscribe', {
        endpoint: subscription.endpoint,
      });

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    localStorage.removeItem('push_subscribed');
    clearBadge();
    console.log('✅ Push unsubscribed');
    return true;
  } catch (err) {
    console.error('Unsubscribe failed:', err);
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
  // Method 1: Direct Badge API (when app is in foreground)
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // Method 2: Tell SW to update badge (for background)
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