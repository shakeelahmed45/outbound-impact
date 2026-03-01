const { saveSubscription, removeSubscription, VAPID_PUBLIC_KEY } = require('../services/webPushService');

// ═══════════════════════════════════════════════════════════
// PUSH NOTIFICATION CONTROLLER
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key for client-side push subscription
 */
const getVapidPublicKey = (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({
      status: 'error',
      message: 'Push notifications not configured',
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

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid subscription data',
      });
    }

    await saveSubscription(userId, subscription, userAgent);

    res.json({
      status: 'success',
      message: 'Push subscription saved',
    });
  } catch (err) {
    console.error('Push subscribe error:', err);
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

    await removeSubscription(endpoint);

    res.json({
      status: 'success',
      message: 'Push subscription removed',
    });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
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