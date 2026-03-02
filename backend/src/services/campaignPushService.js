const webpush = require('web-push');
const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// CAMPAIGN PUSH SERVICE
// Push notifications for PUBLIC viewers who saved a campaign
// to their mobile home screen via "Add to Home Screen".
// These are NOT authenticated users — just public visitors.
// ═══════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const pushConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

/**
 * Save a public push subscription for a specific campaign.
 */
const saveCampaignSubscription = async (campaignId, subscription, userAgent) => {
  try {
    const { endpoint, keys } = subscription;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription — missing endpoint, p256dh, or auth');
    }

    const saved = await prisma.campaignPushSubscription.upsert({
      where: { endpoint },
      update: {
        campaignId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        campaignId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
    });

    const total = await prisma.campaignPushSubscription.count({ where: { campaignId } });
    console.log(`📱 🔔 Campaign push sub saved | Campaign: ${campaignId.slice(0, 8)}... | Total subs: ${total}`);

    return saved;
  } catch (err) {
    console.error(`📱 ❌ Campaign push save failed:`, err.message);
    throw err;
  }
};

/**
 * Remove a campaign push subscription by endpoint.
 */
const removeCampaignSubscription = async (endpoint) => {
  try {
    const result = await prisma.campaignPushSubscription.deleteMany({
      where: { endpoint },
    });
    console.log(`📱 🗑️ Campaign push sub removed (${result.count})`);
    return true;
  } catch (err) {
    console.error('📱 ❌ Campaign push remove failed:', err.message);
    return false;
  }
};

/**
 * Send push notification to ALL public subscribers of a campaign.
 * Called when new content is added to the campaign.
 *
 * @param {string} campaignId
 * @param {object} payload - { title, body, url, badge, campaignName }
 */
const sendPushToCampaignSubscribers = async (campaignId, payload) => {
  if (!pushConfigured) {
    console.log(`📱 ⏭️ Campaign push skipped (VAPID not configured)`);
    return { sent: 0, failed: 0 };
  }

  try {
    const subscriptions = await prisma.campaignPushSubscription.findMany({
      where: { campaignId },
    });

    if (subscriptions.length === 0) {
      console.log(`📱 ⏭️ Campaign push skipped — no subscribers | Campaign: ${campaignId.slice(0, 8)}...`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 📤 Sending campaign push to ${subscriptions.length} subscriber(s) | Campaign: ${campaignId.slice(0, 8)}... | Title: "${payload?.title}"`);

    const pushPayload = JSON.stringify({
      title: payload.title || 'New Content Available',
      body: payload.body || 'New content has been added.',
      url: payload.url || '/',
      category: 'campaign_update',
      tag: `campaign-${campaignId}`,
      badge: payload.badge || 0,
      campaignName: payload.campaignName || '',
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
            { TTL: 60 * 60 * 24 } // 24 hour TTL
          );
          return { success: true, id: sub.id };
        } catch (err) {
          // 410/404 = expired subscription, clean it up
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`📱 🗑️ Removing expired campaign push sub: ${sub.id}`);
            await prisma.campaignPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error(`📱 ❌ Campaign push delivery failed: ${err.statusCode || err.message}`);
          }
          return { success: false, id: sub.id };
        }
      })
    );

    const sent = results.filter(r => r.value?.success).length;
    const failed = results.filter(r => !r.value?.success).length;
    console.log(`📱 ${sent > 0 ? '✅' : '❌'} Campaign push result: ${sent} sent, ${failed} failed`);

    return { sent, failed };
  } catch (err) {
    console.error('📱 ❌ Campaign push error:', err.message);
    return { sent: 0, failed: 0 };
  }
};

module.exports = {
  saveCampaignSubscription,
  removeCampaignSubscription,
  sendPushToCampaignSubscribers,
};