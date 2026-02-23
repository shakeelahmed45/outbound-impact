const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// ✅ FIXED: Add resolveEffectiveUserId middleware
router.get('/stats', authMiddleware, resolveEffectiveUserId, dashboardController.getDashboardStats);

// ✅ NEW: Views Over Time (daily/weekly chart data)
router.get('/views-over-time', authMiddleware, resolveEffectiveUserId, dashboardController.getViewsOverTime);

// ✅ NEW: Recent Activity (latest items with views)
router.get('/recent-activity', authMiddleware, resolveEffectiveUserId, dashboardController.getRecentActivity);

module.exports = router;