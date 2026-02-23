const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const { getAdvancedAnalytics } = require('../controllers/advancedAnalyticsController');

// All routes require authentication + effective user resolution
router.use(authMiddleware);
router.use(resolveEffectiveUserId);

// Get advanced analytics
router.get('/stats', getAdvancedAnalytics);

module.exports = router;