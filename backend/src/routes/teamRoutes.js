const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// Get all team members (team members need effectiveUserId to see owner's team)
router.get('/', authMiddleware, resolveEffectiveUserId, teamController.getTeamMembers);

// Invite a new team member
router.post('/invite', authMiddleware, resolveEffectiveUserId, teamController.inviteTeamMember);

// ✅ NEW: Request role change (used by team members)
router.post('/request-role-change', authMiddleware, teamController.requestRoleChange);

// ✅ NEW: Dismiss role change request (used by org owner)
router.post('/:id/dismiss-request', authMiddleware, teamController.dismissRoleRequest);

// ✅ Update team member role (must be BEFORE the general PUT /:id route)
router.put('/:id/role', authMiddleware, teamController.updateTeamMemberRole);

// ✅ NEW: Update allowed features for a team member
router.put('/:id/features', authMiddleware, resolveEffectiveUserId, teamController.updateFeatures);

// Update team member (general update)
router.put('/:id', authMiddleware, teamController.updateTeamMember);

// Remove a team member
router.delete('/:id', authMiddleware, teamController.removeTeamMember);

// Resend invitation
router.post('/:id/resend', authMiddleware, teamController.resendInvitation);

// Public routes (no authentication required)
router.get('/invitation/:token', teamController.getInvitationDetails);
router.post('/invitation/:token/accept', teamController.acceptInvitation);
router.post('/invitation/:token/decline', teamController.declineInvitation);

module.exports = router;