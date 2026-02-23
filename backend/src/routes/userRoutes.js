const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// Import refund controller
const refundController = require('../controllers/refundController');

/**
 * ✅ NEW: Organization Scope endpoint
 * Returns the logged-in user's org scope info for frontend context
 * Used by SidebarNav to show org banner for team members
 */
router.get('/org-scope', authMiddleware, resolveEffectiveUserId, async (req, res) => {
  try {
    res.json({
      status: 'success',
      isTeamMember: req.isTeamMember || false,
      teamRole: req.teamRole || null,
      orgScope: req.orgScope || null,
      orgNames: req.orgNames || null,
      effectiveUserId: req.effectiveUserId,
    });
  } catch (error) {
    console.error('Get org scope error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get org scope' });
  }
});

/**
 * USER ROUTES
 * 
 * Profile actions (allowed for all team members):
 *   - upload-photo, update profile, change-password
 * 
 * Account-level actions (blocked for VIEWER and EDITOR):
 *   - delete account, change email, refund routes
 */

// ─── Profile actions (all users) ───
router.post('/upload-photo', authMiddleware, userController.uploadProfilePhoto);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/change-password', authMiddleware, userController.changePassword);

// ─── Account-level actions (owner + ADMIN only) ───
// VIEWER and EDITOR cannot delete account or change email
router.delete('/account', authMiddleware, resolveEffectiveUserId, (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can delete accounts',
    });
  }
  next();
}, userController.deleteAccount);

router.put('/change-email', authMiddleware, resolveEffectiveUserId, (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can change the account email',
    });
  }
  next();
}, userController.changeEmail);

/**
 * 🔄 REFUND ROUTES (7-DAY POLICY)
 * Blocked for VIEWER and EDITOR — these are billing operations
 */
router.get('/refund/check-eligibility', authMiddleware, resolveEffectiveUserId, (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can access billing',
    });
  }
  next();
}, refundController.checkRefundEligibility);

router.post('/refund/request', authMiddleware, resolveEffectiveUserId, (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can request refunds',
    });
  }
  next();
}, refundController.requestRefund);

router.get('/refund/status', authMiddleware, resolveEffectiveUserId, (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can access billing',
    });
  }
  next();
}, refundController.getRefundStatus);

module.exports = router;