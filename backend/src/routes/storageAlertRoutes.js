const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/storageAlertController');
const auth     = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// GET  /api/storage-alerts/status    — user's storage percentage + pack info
router.get('/status', auth, resolveEffectiveUserId, ctrl.getStorageStatus);

// POST /api/storage-alerts/checkout  — create Stripe checkout for storage add-on
router.post('/checkout', auth, resolveEffectiveUserId, ctrl.createStorageAddonCheckout);

// POST /api/storage-alerts/run       — admin: manually fire the alert cron job
router.post('/run', auth, ctrl.triggerAlertJob);

module.exports = router;