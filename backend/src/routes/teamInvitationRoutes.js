const express = require('express');
const router = express.Router();
const teamInvitationController = require('../controllers/teamInvitationController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// ═══════════════════════════════════════════════════════════

// ✅ Get invitation details by token (for the accept page)
router.get('/invitation/:token', teamInvitationController.getInvitationByToken);

// ✅ Accept invitation (token in URL - matches frontend pattern)
router.post('/invitation/:token/accept', teamInvitationController.acceptInvitationWithParams);

// ✅ Decline invitation (token in URL - matches frontend pattern)
router.post('/invitation/:token/decline', teamInvitationController.declineInvitation);

// Legacy route (token in body)
router.post('/accept-invitation', teamInvitationController.acceptInvitation);

// ═══════════════════════════════════════════════════════════
// PROTECTED ROUTES (Require ADMIN only)
// ═══════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(requireAdmin); // Only ADMIN role

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