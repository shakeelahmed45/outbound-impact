const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pushController = require('../controllers/pushController');

// Public: Get VAPID public key (needed before subscription)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Authenticated: Subscribe/unsubscribe
router.post('/subscribe', authMiddleware, pushController.subscribe);
router.post('/unsubscribe', authMiddleware, pushController.unsubscribe);

module.exports = router;