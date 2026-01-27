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

// Import enhanced user controller
const {
  getAllUsers,
  bulkUserActions,
  suspendUser,
  impersonateUser,
  exportUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  removeUserFromTeam,
  sendPasswordReset
} = require('../controllers/adminUserController');

// Import existing item controller
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
// USER MANAGEMENT ROUTES (Enhanced)
// ═══════════════════════════════════════════════════════════

// List & Filter Users
router.get('/users', getAllUsers);

// Bulk Actions
router.post('/users/bulk-action', bulkUserActions);

// Export Users
router.get('/users/export', exportUsers);

// User Details
router.get('/users/:userId', getUserDetails);

// Update User
router.put('/users/:userId', updateUser);

// Delete User
router.delete('/users/:userId', deleteUser);

// Suspend/Unsuspend User
router.post('/users/:userId/suspend', suspendUser);

// Impersonate User
router.post('/users/:userId/impersonate', impersonateUser);

// Password Reset
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