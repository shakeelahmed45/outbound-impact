const webpush = require('web-push');
const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// WEB PUSH SERVICE
// Sends real-time push notifications to user devices
// Uses VAPID (Voluntary Application Server Identification)
// ═══════════════════════════════════════════════════════════

// Configure VAPID keys from environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@outboundimpact.org';

let pushConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushConfigured = true;
    console.log('✅ Web Push configured with VAPID keys');
  } catch (err) {
    console.error('❌ Web Push VAPID configuration failed:', err.message);
  }
} else {
  console.log('⚠️ Web Push disabled (VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY not set)');
  console.log('   Generate keys: npx web-push generate-vapid-keys');
}

/**
 * Send push notification to ALL subscribed devices for a user.
 * Non-blocking — never throws.
 *
 * @param {string} userId - The user to notify
 * @param {object} payload - { title, body, url, category, tag, notificationId }
 */
const sendPushToUser = async (userId, payload) => {
  if (!pushConfigured) return;
  if (!userId) return;

  try {
    // Get all push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    // Get unread count for badge
    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    const pushPayload = JSON.stringify({
      title: payload.title || 'Outbound Impact',
      body: payload.body || payload.message || '',
      url: payload.url || '/dashboard',
      category: payload.category || 'general',
      tag: payload.tag || payload.category || 'default',
      notificationId: payload.notificationId || null,
      unreadCount: unreadCount,
    });

    // Send to all devices in parallel
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload,
            { TTL: 60 * 60 } // 1 hour TTL
          );
          return { success: true, id: sub.id };
        } catch (err) {
          // 410 Gone or 404 = subscription expired, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`📱 Removing expired push subscription: ${sub.id}`);
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          return { success: false, id: sub.id, error: err.message };
        }
      })
    );

    const sent = results.filter(r => r.value?.success).length;
    if (sent > 0) {
      console.log(`📱 Push sent: "${payload.title}" → ${sent}/${subscriptions.length} device(s) for user ${userId.slice(0, 8)}...`);
    }
  } catch (err) {
    // Never break the main flow
    console.error('📱 ❌ Push notification error:', err.message);
  }
};

/**
 * Save a push subscription for a user
 */
const saveSubscription = async (userId, subscription, userAgent) => {
  try {
    const { endpoint, keys } = subscription;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription format');
    }

    // Upsert: update if endpoint exists, create if new
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
    });

    console.log(`📱 Push subscription saved for user ${userId.slice(0, 8)}...`);
    return saved;
  } catch (err) {
    console.error('📱 ❌ Save subscription failed:', err.message);
    throw err;
  }
};

/**
 * Remove a push subscription by endpoint
 */
const removeSubscription = async (endpoint) => {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    console.log('📱 Push subscription removed');
    return true;
  } catch (err) {
    console.error('📱 ❌ Remove subscription failed:', err.message);
    return false;
  }
};

/**
 * Remove all subscriptions for a user
 */
const removeAllSubscriptions = async (userId) => {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId },
    });
    return true;
  } catch (err) {
    console.error('📱 ❌ Remove all subscriptions failed:', err.message);
    return false;
  }
};

module.exports = {
  sendPushToUser,
  saveSubscription,
  removeSubscription,
  removeAllSubscriptions,
  VAPID_PUBLIC_KEY,
  pushConfigured,
};