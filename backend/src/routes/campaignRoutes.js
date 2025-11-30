const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, campaignController.getUserCampaigns);
router.post('/', authMiddleware, campaignController.createCampaign);
router.put('/:id', authMiddleware, campaignController.updateCampaign);
router.delete('/:id', authMiddleware, campaignController.deleteCampaign);
router.post('/assign', authMiddleware, campaignController.assignItemToCampaign);

module.exports = router;