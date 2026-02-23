// ═══════════════════════════════════════════════════════════
// routes/messageRoutes.js
// Inbox messaging endpoints
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const messageController = require('../controllers/messageController');

// GET /api/messages — list messages (inbox or sent)
router.get('/', authMiddleware, resolveEffectiveUserId, messageController.getMessages);

// GET /api/messages/unread-count — badge count
router.get('/unread-count', authMiddleware, messageController.getUnreadCount);

// GET /api/messages/team-recipients — who can I message?
router.get('/team-recipients', authMiddleware, resolveEffectiveUserId, messageController.getTeamRecipients);

// POST /api/messages/internal — send team message
router.post('/internal', authMiddleware, resolveEffectiveUserId, messageController.sendInternal);

// POST /api/messages/external — send external email
router.post('/external', authMiddleware, messageController.sendExternal);

// PUT /api/messages/:id/read — mark as read
router.put('/:id/read', authMiddleware, messageController.markAsRead);

// PUT /api/messages/:id/star — toggle star
router.put('/:id/star', authMiddleware, messageController.toggleStar);

// DELETE /api/messages/:id — archive/delete
router.delete('/:id', authMiddleware, messageController.deleteMessage);

module.exports = router;