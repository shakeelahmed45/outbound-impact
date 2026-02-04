const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// ✅ NEW: Configure multer for memory storage
// Files are stored in memory as Buffer objects (no disk I/O)
const storage = multer.memoryStorage();

// ✅ NEW: Configure upload limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    // Validation happens in controller based on 'type' field
    cb(null, true);
  }
});

// ✅ NEW: File upload route with multer middleware
// Handles both:
// 1. multipart/form-data (NEW - no memory issues!)
// 2. application/json with base64 (OLD - backward compatibility)
router.post(
  '/file',
  authMiddleware,
  resolveEffectiveUserId,
  upload.single('file'), // Handles multipart uploads, passes through JSON
  uploadController.uploadFile
);

// Text and embed posts don't need multer (no file upload)
router.post('/text', authMiddleware, resolveEffectiveUserId, uploadController.createTextPost);
router.post('/embed', authMiddleware, resolveEffectiveUserId, uploadController.createEmbedPost);

module.exports = router;