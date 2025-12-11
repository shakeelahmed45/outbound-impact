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

module.exports = router;