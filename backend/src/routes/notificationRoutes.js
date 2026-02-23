const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const notificationController = require('../controllers/notificationController');

// All routes require auth
router.use(authMiddleware);
router.use(resolveEffectiveUserId);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.clearAll);

module.exports = router;