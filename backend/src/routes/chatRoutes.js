const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// ═══════════════════════════════════════════════════════════
// MULTER CONFIGURATION FOR FILE UPLOADS
// ═══════════════════════════════════════════════════════════

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

// ═══════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════

// Get or create user's conversation
router.get(
  '/conversation',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.getOrCreateConversation
);

// 🆕 NEW: Get messages for a conversation (for polling)
router.get(
  '/conversation/:conversationId/messages',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.getMessages
);

// Send message (with optional file attachments)
router.post(
  '/message',
  authMiddleware,
  resolveEffectiveUserId,
  upload.array('files', 5),
  chatController.sendMessage
);

// Start new conversation (closes current, creates new)
router.post(
  '/start-new',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.startNewConversation
);

// Submit feedback on AI response
router.post(
  '/ai-feedback',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.submitAiFeedback
);

// Request human support (escalate from AI)
router.post(
  '/request-human',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.requestHumanSupport
);

// 🆕 NEW: Get chat history
router.get(
  '/history',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.getChatHistory
);

// 🆕 NEW: Submit conversation feedback (rating + comment)
router.post(
  '/conversation/:conversationId/feedback',
  authMiddleware,
  resolveEffectiveUserId,
  chatController.submitConversationFeedback
);

// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES
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