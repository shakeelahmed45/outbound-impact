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

// ✅ Accept invitation - token in body (legacy)
router.post('/accept-invitation', teamInvitationController.acceptInvitation);

// ✅ NEW: Accept invitation - token in URL params (matches frontend)
router.post('/invitation/:token/accept', teamInvitationController.acceptInvitationWithParams);

// ✅ NEW: Decline invitation - token in URL params
router.post('/invitation/:token/decline', teamInvitationController.declineInvitation);

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