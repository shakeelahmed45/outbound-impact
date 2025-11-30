const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const authMiddleware = require('../middleware/auth');

// Protected routes (require authentication)
router.get('/', authMiddleware, itemsController.getUserItems);
router.get('/:id', authMiddleware, itemsController.getItemById);
router.post('/:id/qr', authMiddleware, itemsController.generateQRCode);
router.put('/:id', authMiddleware, itemsController.updateItem);
router.delete('/:id', authMiddleware, itemsController.deleteItem);

// Public route (no authentication required)
router.get('/public/:slug', itemsController.getPublicItem);

module.exports = router;
