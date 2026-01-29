const express = require('express');
const router = express.Router();
const teamInvitationController = require('../controllers/teamInvitationController');
const { authMiddleware, requireFullAdmin } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// ═══════════════════════════════════════════════════════════
// Accept invitation and create account
router.post('/accept-invitation', teamInvitationController.acceptInvitation);

// ═══════════════════════════════════════════════════════════
// PROTECTED ROUTES (Require FULL ADMIN only)
// ═══════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(requireFullAdmin); // Only ADMIN role, not CUSTOMER_SUPPORT

// Invite new team member
router.post('/invite', teamInvitationController.inviteTeamMember);

// Get all invitations
router.get('/invitations', teamInvitationController.getAllInvitations);

// Resend invitation
router.post('/invitations/:invitationId/resend', teamInvitationController.resendInvitation);

// Delete invitation
router.delete('/invitations/:invitationId', teamInvitationController.deleteInvitation);

// Get all team members
router.get('/members', teamInvitationController.getAllTeamMembers);

// Remove team member
router.delete('/members/:userId', teamInvitationController.removeTeamMember);

module.exports = router;