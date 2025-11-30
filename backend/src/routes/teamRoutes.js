const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, teamController.getTeamMembers);
router.post('/invite', authMiddleware, teamController.inviteTeamMember);
router.delete('/:id', authMiddleware, teamController.removeTeamMember);

module.exports = router;