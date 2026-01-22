const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// ═══════════════════════════════════════════════════════════
// USER ROUTES - Protected by authMiddleware
// ═══════════════════════════════════════════════════════════

// Get or create user's conversation
router.get(
  '/conversation',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.getOrCreateConversation
);

// Send message (works for both user and admin)
router.post(
  '/message',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.sendMessage
);

// Start new conversation (closes current, creates new)
router.post(
  '/start-new',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.startNewConversation
);

// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES - Protected by authMiddleware + adminMiddleware
// ═══════════════════════════════════════════════════════════

// Get all conversations with optional status filter
router.get(
  '/all-conversations',
  authMiddleware,
  resolveEffectiveUserId,
  requireAdmin,
  chatController.getAllConversations
);

// Get single conversation by ID
router.get(
  '/conversation/:id',
  authMiddleware,
  resolveEffectiveUserId,
  requireAdmin,
  chatController.getConversationById
);

// Close conversation
router.patch(
  '/conversation/:id/close',
  authMiddleware,
  resolveEffectiveUserId,
  requireAdmin,
  chatController.closeConversation
);

// Reopen conversation
router.patch(
  '/conversation/:id/reopen',
  authMiddleware,
  resolveEffectiveUserId,
  requireAdmin,
  chatController.reopenConversation
);

// Get unread message count
router.get(
  '/unread-count',
  authMiddleware,
  resolveEffectiveUserId,
  requireAdmin,
  chatController.getUnreadCount
);

module.exports = router;