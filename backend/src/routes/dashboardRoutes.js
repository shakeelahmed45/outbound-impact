const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// ✅ FIXED: Add resolveEffectiveUserId middleware
router.get('/stats', authMiddleware, resolveEffectiveUserId, dashboardController.getDashboardStats);

module.exports = router;