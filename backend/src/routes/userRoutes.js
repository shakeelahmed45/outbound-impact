const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.post('/upload-photo', authMiddleware, userController.uploadProfilePhoto);
router.put('/profile', authMiddleware, userController.updateProfile);
router.delete('/account', authMiddleware, userController.deleteAccount);
router.put('/change-email', authMiddleware, userController.changeEmail); // ✅ NEW: Email change route

module.exports = router;