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

// NFC routes for campaigns
router.get('/:id/nfc', authMiddleware, campaignController.getCampaignNFC);
router.post('/:id/nfc/enable', authMiddleware, campaignController.enableCampaignNFC);
router.post('/:id/nfc/disable', authMiddleware, campaignController.disableCampaignNFC);
router.get('/:id/nfc/full', authMiddleware, campaignController.getCampaignFullNFC);

module.exports = router;
