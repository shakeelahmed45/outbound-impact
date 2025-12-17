const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId'); // ✅ NEW

// Public route (NO auth required)
router.get('/public/:slug', campaignController.getPublicCampaign);

// ✅ FIXED: Add resolveEffectiveUserId middleware to all protected routes
router.get('/', authMiddleware, resolveEffectiveUserId, campaignController.getUserCampaigns);
router.post('/', authMiddleware, resolveEffectiveUserId, campaignController.createCampaign);
router.put('/:id', authMiddleware, resolveEffectiveUserId, campaignController.updateCampaign);
router.delete('/:id', authMiddleware, resolveEffectiveUserId, campaignController.deleteCampaign);
router.post('/assign', authMiddleware, resolveEffectiveUserId, campaignController.assignItemToCampaign);

module.exports = router;