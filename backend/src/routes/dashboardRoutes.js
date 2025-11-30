const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// All dashboard routes require authentication
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
