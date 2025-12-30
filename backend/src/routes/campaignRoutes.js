const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

// ═══════════════════════════════════════════════════════════════════
// 🌍 PUBLIC ROUTES (No authentication required)
// ═══════════════════════════════════════════════════════════════════

// Get public campaign by slug
router.get('/public/:slug', campaignController.getPublicCampaign);

// ✅ NEW: Verify campaign password
router.post('/public/:slug/verify', campaignController.verifyCampaignPassword);

// ═══════════════════════════════════════════════════════════════════
// 🔒 PROTECTED ROUTES (Authentication required)
// ═══════════════════════════════════════════════════════════════════

// Get all campaigns for authenticated user
router.get('/', authMiddleware, resolveEffectiveUserId, campaignController.getUserCampaigns);

// Create new campaign
router.post('/', authMiddleware, resolveEffectiveUserId, campaignController.createCampaign);

// Update campaign
router.put('/:id', authMiddleware, resolveEffectiveUserId, campaignController.updateCampaign);

// Delete campaign
router.delete('/:id', authMiddleware, resolveEffectiveUserId, campaignController.deleteCampaign);

// Assign/unassign item to campaign
router.post('/assign', authMiddleware, resolveEffectiveUserId, campaignController.assignItemToCampaign);

module.exports = router;