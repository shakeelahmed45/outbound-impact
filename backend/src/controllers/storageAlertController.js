// ═══════════════════════════════════════════════════════════════
// STORAGE ALERT CONTROLLER
//
// Endpoints:
//   POST /api/storage-alerts/checkout   — create Stripe checkout for storage add-on
//   POST /api/storage-alerts/run        — manually trigger alert job (admin only)
//   GET  /api/storage-alerts/status     — get current user's storage status
// ═══════════════════════════════════════════════════════════════

const prisma  = require('../lib/prisma');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Storage add-on packs: maps GB → Stripe one-time price ID env var
// You need to create 3 one-time prices in Stripe and add their IDs to .env:
//   STRIPE_STORAGE_50GB_PRICE   e.g. price_xxxxx  ($4.99 one-time)
//   STRIPE_STORAGE_100GB_PRICE  e.g. price_xxxxx  ($8.99 one-time)
//   STRIPE_STORAGE_200GB_PRICE  e.g. price_xxxxx  ($14.99 one-time)

const STORAGE_PACKS = [
  {
    gb:        50,
    bytes:     50  * 1024 * 1024 * 1024,
    label:     '50 GB Add-on',
    price:     4.99,
    envVar:    'STRIPE_STORAGE_50GB_PRICE',
    icon:      '📦',
    popular:   false,
  },
  {
    gb:        100,
    bytes:     100 * 1024 * 1024 * 1024,
    label:     '100 GB Add-on',
    price:     8.99,
    envVar:    'STRIPE_STORAGE_100GB_PRICE',
    icon:      '🚀',
    popular:   true,
  },
  {
    gb:        200,
    bytes:     200 * 1024 * 1024 * 1024,
    label:     '200 GB Add-on',
    price:     14.99,
    envVar:    'STRIPE_STORAGE_200GB_PRICE',
    icon:      '💎',
    popular:   false,
  },
];

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (n === 0) return '0 Bytes';
  const k     = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ── GET /api/storage-alerts/status ───────────────────────────
const getStorageStatus = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { storageUsed: true, storageLimit: true, role: true },
    });

    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    const storageUsed  = Number(user.storageUsed  || 0);
    const storageLimit = Number(user.storageLimit  || 2147483648);
    const percentUsed  = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

    const packs = STORAGE_PACKS.map(p => ({
      gb:        p.gb,
      label:     p.label,
      price:     p.price,
      icon:      p.icon,
      popular:   p.popular,
      available: !!process.env[p.envVar],  // tell frontend if Stripe price is configured
    }));

    res.json({
      status: 'success',
      storage: {
        used:        storageUsed.toString(),
        limit:       storageLimit.toString(),
        usedFormatted:  formatBytes(storageUsed),
        limitFormatted: formatBytes(storageLimit),
        percentUsed,
        isWarning:   percentUsed >= 80,
        isCritical:  percentUsed >= 95,
      },
      packs,
    });
  } catch (err) {
    console.error('getStorageStatus error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get storage status' });
  }
};

// ── POST /api/storage-alerts/checkout ────────────────────────
const createStorageAddonCheckout = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;
    const { gb }  = req.body;  // e.g. 50 | 100 | 200

    const pack = STORAGE_PACKS.find(p => p.gb === Number(gb));
    if (!pack) {
      return res.status(400).json({ status: 'error', message: 'Invalid storage pack size. Choose 50, 100, or 200 GB.' });
    }

    const priceId = process.env[pack.envVar];
    if (!priceId) {
      return res.status(400).json({
        status:  'error',
        message: `Storage add-on not yet configured. Please contact support@outboundimpact.org.`,
      });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true, storageLimit: true, role: true },
    });

    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';

    const sessionParams = {
      mode:         'payment',
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      success_url: `${frontendUrl}/dashboard?storage_success=1&gb=${pack.gb}`,
      cancel_url:  `${frontendUrl}/dashboard?storage_cancelled=1`,
      metadata: {
        type:          'storage_addon',
        userId:        user.id,
        addedGB:       pack.gb.toString(),
        addedBytes:    pack.bytes.toString(),
      },
      payment_intent_data: {
        metadata: {
          type:       'storage_addon',
          userId:     user.id,
          addedGB:    pack.gb.toString(),
        },
      },
    };

    // Pre-fill email if user has a Stripe customer
    if (user.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Storage add-on checkout created: ${user.email} → ${pack.gb}GB (${session.id})`);

    res.json({
      status:      'success',
      checkoutUrl: session.url,
      sessionId:   session.id,
    });
  } catch (err) {
    console.error('createStorageAddonCheckout error:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to create checkout session' });
  }
};

// ── POST /api/storage-alerts/run (Admin only) ─────────────────
const triggerAlertJob = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Admin only' });
    }

    // Fire async — don't await so the response is immediate
    const { runStorageAlertJob } = require('../services/storageAlertService');
    runStorageAlertJob().catch(console.error);

    res.json({ status: 'success', message: 'Storage alert job triggered. Check server logs.' });
  } catch (err) {
    console.error('triggerAlertJob error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to trigger job' });
  }
};

module.exports = { getStorageStatus, createStorageAddonCheckout, triggerAlertJob };