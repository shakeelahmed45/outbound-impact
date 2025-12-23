const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// ✅ FIXED: Add resolveEffectiveUserId middleware to all routes
router.post('/file', authMiddleware, resolveEffectiveUserId, uploadController.uploadFile);
router.post('/text', authMiddleware, resolveEffectiveUserId, uploadController.createTextPost);
router.post('/embed', authMiddleware, resolveEffectiveUserId, uploadController.createEmbedPost);

module.exports = router;