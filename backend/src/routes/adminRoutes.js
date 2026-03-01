const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { getAdminStats, getAnalytics, getRecentActivities } = require('../controllers/adminAnalyticsController');
const { getAllUsers, bulkUserActions, suspendUser, impersonateUser, exportUsers, exportSelectedUsers, getUserDetails, updateUser, deleteUser, removeUserFromTeam, sendPasswordReset } = require('../controllers/adminUserController');
const { getAllItems, deleteItem } = require('../controllers/adminController');
const { getOverview, getRevenue, getOpportunities, getGeography, sendCampaign, getCampaignHistory, getDiscountCodes, createDiscountCode, deleteDiscountCode, getRevenueHistory } = require('../controllers/adminOverviewController');
const { getSettings, updateSettings, getPublicSettings } = require('../controllers/adminSettingsController');

// ═══════════════════════════════════════════════════════════
// PUBLIC (no auth) — Frontend needs currency/name without login
// ═══════════════════════════════════════════════════════════
router.get('/settings/public', getPublicSettings);

// ═══════════════════════════════════════════════════════════
// ALL ROUTES BELOW REQUIRE AUTH + ADMIN
// ═══════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard & Analytics
router.get('/stats', getAdminStats);
router.get('/analytics', getAnalytics);
router.get('/recent-activities', getRecentActivities);

// Pablo Admin Panel
router.get('/overview', getOverview);
router.get('/revenue', getRevenue);
router.get('/revenue/history', getRevenueHistory);
router.get('/opportunities', getOpportunities);
router.get('/geography', getGeography);
router.post('/campaigns/send', sendCampaign);
router.get('/campaigns/history', getCampaignHistory);
router.get('/discount-codes', getDiscountCodes);
router.post('/discount-codes', createDiscountCode);
router.delete('/discount-codes/:codeId', deleteDiscountCode);

// Settings (admin only)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Users
router.get('/users', getAllUsers);
router.get('/users/export', exportUsers);
router.post('/users/export-selected', exportSelectedUsers);
router.post('/users/bulk-action', bulkUserActions);
router.get('/users/:userId', getUserDetails);
router.get('/users/:userId/activity', getUserDetails);
router.put('/users/:userId', updateUser);
router.put('/users/:userId/storage', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/ban', suspendUser);
router.post('/users/:userId/impersonate', impersonateUser);
router.post('/users/:userId/password-reset', sendPasswordReset);

// Items
router.get('/items', getAllItems);
router.delete('/items/:itemId', deleteItem);

// Team
router.delete('/team-members/:teamMemberId', removeUserFromTeam);

module.exports = router;