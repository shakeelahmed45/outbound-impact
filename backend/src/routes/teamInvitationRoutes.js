const express = require('express');
const router = express.Router();
const teamInvitationController = require('../controllers/teamInvitationController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES — Admin invitation acceptance
// These use /api/team-invitation/ path (mounted separately in server.js)
// Regular team invitations use teamRoutes' /invitation/:token handlers
// ═══════════════════════════════════════════════════════════

// ✅ Get admin invitation details by token
router.get('/admin-invitation/:token', teamInvitationController.getInvitationByToken);

// ✅ Accept admin invitation - token in body (legacy)
router.post('/accept-invitation', teamInvitationController.acceptInvitation);

// ✅ Accept admin invitation - token in URL params
router.post('/admin-invitation/:token/accept', teamInvitationController.acceptInvitationWithParams);

// ✅ Decline admin invitation - token in URL params
router.post('/admin-invitation/:token/decline', teamInvitationController.declineInvitation);

// ═══════════════════════════════════════════════════════════
// PROTECTED ROUTES (Require ADMIN only)
// ✅ FIX: Apply auth + requireAdmin per-route instead of
//         blanket router.use() which was blocking GET /api/team
//         from reaching teamRoutes for regular users
// ═══════════════════════════════════════════════════════════

// Invite new team member (ADMIN PANEL ONLY)
router.post('/admin-invite', authMiddleware, requireAdmin, teamInvitationController.inviteTeamMember);

// Get all invitations
router.get('/invitations', authMiddleware, requireAdmin, teamInvitationController.getAllInvitations);

// Resend invitation
router.post('/invitations/:invitationId/resend', authMiddleware, requireAdmin, teamInvitationController.resendInvitation);

// Delete invitation
router.delete('/invitations/:invitationId', authMiddleware, requireAdmin, teamInvitationController.deleteInvitation);

// Get all team members
router.get('/members', authMiddleware, requireAdmin, teamInvitationController.getAllTeamMembers);

// Remove team member
router.delete('/members/:userId', authMiddleware, requireAdmin, teamInvitationController.removeTeamMember);

module.exports = router;