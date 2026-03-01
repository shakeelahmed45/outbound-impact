const { saveSubscription, removeSubscription, VAPID_PUBLIC_KEY, pushConfigured } = require('../services/webPushService');

// ═══════════════════════════════════════════════════════════
// PUSH NOTIFICATION CONTROLLER
// ✅ FIX: Added comprehensive logging
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key for client-side push subscription
 */
const getVapidPublicKey = (req, res) => {
  console.log(`📱 VAPID key requested | Configured: ${pushConfigured} | Key exists: ${!!VAPID_PUBLIC_KEY}`);

  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({
      status: 'error',
      message: 'Push notifications not configured — VAPID_PUBLIC_KEY missing',
    });
  }

  res.json({
    status: 'success',
    publicKey: VAPID_PUBLIC_KEY,
  });
};

/**
 * POST /api/push/subscribe
 * Save a push subscription for the authenticated user
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
const subscribe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;
    const userAgent = req.headers['user-agent'];

    console.log(`📱 Subscribe request | User: ${userId.slice(0, 8)}... | Role: ${req.user.role} | Has subscription data: ${!!subscription}`);

    if (!subscription || !subscription.endpoint) {
      console.log('📱 ❌ Subscribe rejected — missing subscription.endpoint');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid subscription data',
      });
    }

    console.log(`📱 Saving subscription | Endpoint: ${subscription.endpoint.slice(0, 60)}...`);
    await saveSubscription(userId, subscription, userAgent);

    res.json({
      status: 'success',
      message: 'Push subscription saved',
    });
  } catch (err) {
    console.error('📱 ❌ Push subscribe error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save subscription',
    });
  }
};

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription
 * Body: { endpoint: string }
 */
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        status: 'error',
        message: 'Endpoint required',
      });
    }

    console.log(`📱 Unsubscribe | Endpoint: ${endpoint.slice(0, 60)}...`);
    await removeSubscription(endpoint);

    res.json({
      status: 'success',
      message: 'Push subscription removed',
    });
  } catch (err) {
    console.error('📱 ❌ Push unsubscribe error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove subscription',
    });
  }
};

module.exports = {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
};