const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getAdvancedAnalytics } = require('../controllers/advancedAnalyticsController');

// All routes require authentication
router.use(authMiddleware);

// Get advanced analytics
router.get('/stats', getAdvancedAnalytics);

module.exports = router;