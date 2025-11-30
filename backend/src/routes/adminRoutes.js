const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAdminStats,
  getAllUsers,
  getAllItems,
  updateUser,
  deleteUser,
  deleteItem
} = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(authMiddleware.requireAdmin);

// Admin dashboard stats
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Item management
router.get('/items', getAllItems);
router.delete('/items/:itemId', deleteItem);

module.exports = router;