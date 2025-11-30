const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');

router.post('/file', authMiddleware, uploadController.uploadFile);
router.post('/text', authMiddleware, uploadController.createTextPost);

module.exports = router;
