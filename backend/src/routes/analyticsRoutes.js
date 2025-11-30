const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

router.post('/track', analyticsController.trackView);
router.get('/', authMiddleware, analyticsController.getAnalytics);
router.get('/item/:id', authMiddleware, analyticsController.getItemAnalytics);

module.exports = router;