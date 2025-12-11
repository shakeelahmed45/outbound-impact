const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

// Get all team members
router.get('/', authMiddleware, teamController.getTeamMembers);

// Invite a new team member
router.post('/invite', authMiddleware, teamController.inviteTeamMember);

// Update team member role
router.put('/:id', authMiddleware, teamController.updateTeamMember);

// Remove a team member
router.delete('/:id', authMiddleware, teamController.removeTeamMember);

// Add these lines to your existing teamRoutes.js:

// Resend invitation
router.post('/:id/resend', authMiddleware, teamController.resendInvitation);

// Public routes (no authentication required)
router.get('/invitation/:token', teamController.getInvitationDetails);
router.post('/invitation/:token/accept', teamController.acceptInvitation);
router.post('/invitation/:token/decline', teamController.declineInvitation);

module.exports = router;