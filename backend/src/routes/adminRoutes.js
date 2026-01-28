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

// Import user management from adminUserController
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
// USER MANAGEMENT ROUTES (Enhanced Phase 2)
// ═══════════════════════════════════════════════════════════

// List & Filter Users
router.get('/users', getAllUsers);

// Export Users
router.get('/users/export', exportUsers);

// Bulk Actions
router.post('/users/bulk-action', bulkUserActions);

// User Details
router.get('/users/:userId', getUserDetails);

// Get User Activity (alias for getUserDetails)
router.get('/users/:userId/activity', getUserDetails);

// Update User
router.put('/users/:userId', updateUser);

// Update Storage Limit
router.put('/users/:userId/storage', updateUser);

// Delete User
router.delete('/users/:userId', deleteUser);

// Suspend/Unsuspend User
router.post('/users/:userId/suspend', suspendUser);

// Ban User (alias for suspend)
router.post('/users/:userId/ban', suspendUser);

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