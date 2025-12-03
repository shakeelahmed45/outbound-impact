const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

// Register a file that was uploaded directly to Bunny.net
router.post('/register', auth, uploadController.registerDirectUpload);

// Create text post
router.post('/text', auth, uploadController.uploadText);

// Old upload route (deprecated, but kept for backward compatibility)
// router.post('/file', auth, uploadController.uploadFile);

module.exports = router;