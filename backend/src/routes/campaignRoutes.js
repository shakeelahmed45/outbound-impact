const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/auth');

// Public route (NO auth required)
router.get('/public/:slug', campaignController.getPublicCampaign);

// Protected routes (auth required)
router.get('/', authMiddleware, campaignController.getUserCampaigns);
router.post('/', authMiddleware, campaignController.createCampaign);
router.put('/:id', authMiddleware, campaignController.updateCampaign);
router.delete('/:id', authMiddleware, campaignController.deleteCampaign);
router.post('/assign', authMiddleware, campaignController.assignItemToCampaign);

// NFC route
router.get('/:id/nfc', authMiddleware, campaignController.getCampaignNFC);

module.exports = router;
