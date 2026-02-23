const prisma = require('../lib/prisma');

// GET /api/notifications - Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;
    const { limit = 20, unreadOnly = false } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') where.read = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit) || 20,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    res.json({
      status: 'success',
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get notifications' });
  }
};

// PATCH /api/notifications/:id/read - Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    if (notification.count === 0) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark notification as read' });
  }
};

// PATCH /api/notifications/read-all - Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark all as read' });
  }
};

// DELETE /api/notifications/:id - Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;
    const { id } = req.params;

    const result = await prisma.notification.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete notification' });
  }
};

// DELETE /api/notifications - Clear all notifications
const clearAll = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to clear notifications' });
  }
};

// GET /api/notifications/unread-count - Quick unread count (for badge polling)
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.effectiveUserId || req.user.userId;

    const count = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ status: 'success', unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get unread count' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  getUnreadCount,
};