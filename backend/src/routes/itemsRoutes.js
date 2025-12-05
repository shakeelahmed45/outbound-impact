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

// NFC routes (protected)
router.get('/:id/nfc', authMiddleware, itemsController.getNFCData);
router.post('/:id/nfc/enable', authMiddleware, itemsController.enableNFC);
router.post('/:id/nfc/disable', authMiddleware, itemsController.disableNFC);
router.get('/:id/nfc/stats', authMiddleware, itemsController.getNFCStats);
router.post('/nfc/bulk-enable', authMiddleware, itemsController.bulkEnableNFC);

// Public route (no authentication required)
router.get('/public/:slug', itemsController.getPublicItem);

module.exports = router;