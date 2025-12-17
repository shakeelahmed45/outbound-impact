const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// Public route (no auth)
router.post('/track', analyticsController.trackView);

// ✅ FIXED: Add resolveEffectiveUserId middleware to protected routes
router.get('/', authMiddleware, resolveEffectiveUserId, analyticsController.getAnalytics);
router.get('/item/:id', authMiddleware, resolveEffectiveUserId, analyticsController.getItemAnalytics);

module.exports = router;