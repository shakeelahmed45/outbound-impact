const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const authMiddleware = require('../middleware/auth');

// Public route (no auth)
router.get('/public/:slug', itemsController.getPublicItem);

// Protected routes
router.get('/', authMiddleware, itemsController.getUserItems);
router.get('/:id', authMiddleware, itemsController.getItemById);
router.put('/:id', authMiddleware, itemsController.updateItem);
router.delete('/:id', authMiddleware, itemsController.deleteItem);

// Thumbnail routes
router.post('/:id/thumbnail', authMiddleware, itemsController.uploadThumbnail);
router.delete('/:id/thumbnail', authMiddleware, itemsController.removeThumbnail);

module.exports = router;