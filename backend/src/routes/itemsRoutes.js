const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// Public route (no auth)
router.get('/public/:slug', itemsController.getPublicItem);

// ✅ FIXED: Add resolveEffectiveUserId middleware to all protected routes
router.get('/', authMiddleware, resolveEffectiveUserId, itemsController.getUserItems);
router.get('/:id', authMiddleware, resolveEffectiveUserId, itemsController.getItemById);
router.put('/:id', authMiddleware, resolveEffectiveUserId, itemsController.updateItem);
router.delete('/:id', authMiddleware, resolveEffectiveUserId, itemsController.deleteItem);

// Thumbnail routes
router.post('/:id/thumbnail', authMiddleware, resolveEffectiveUserId, itemsController.uploadThumbnail);
router.delete('/:id/thumbnail', authMiddleware, resolveEffectiveUserId, itemsController.removeThumbnail);

module.exports = router;