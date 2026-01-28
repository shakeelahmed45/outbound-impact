const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// Import analytics controller
const {
  getAdminStats,
  getAnalytics,
  getRecentActivities
} = require('../controllers/adminAnalyticsController');

// Import user management from adminUserController (NOT adminController!)
const {
  getAllUsers,
  updateUser,
  deleteUser,
  removeUserFromTeam,
  sendPasswordReset
} = require('../controllers/adminUserController');

// Import item management from adminController
const {
  getAllItems,
  deleteItem
} = require('../controllers/adminController');

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE - All routes require authentication and admin role
// ═══════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(requireAdmin);

// ═══════════════════════════════════════════════════════════
// DASHBOARD & ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════
router.get('/stats', getAdminStats);
router.get('/analytics', getAnalytics);
router.get('/recent-activities', getRecentActivities);

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/users/:userId/password-reset', sendPasswordReset);

// ═══════════════════════════════════════════════════════════
// ITEM MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════
router.get('/items', getAllItems);
router.delete('/items/:itemId', deleteItem);

// ═══════════════════════════════════════════════════════════
// TEAM MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════
router.delete('/team-members/:teamMemberId', removeUserFromTeam);

module.exports = router;