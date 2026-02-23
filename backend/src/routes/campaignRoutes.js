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

// ✅ NEW: Track campaign page view (public, no auth needed)
router.post('/public/:slug/track', campaignController.trackCampaignView);

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

// Update campaign item order
router.put('/:slug/order', authMiddleware, resolveEffectiveUserId, campaignController.updateCampaignOrder);

// ✅ NEW: Regenerate QR code with tracking parameter
router.post('/:id/regenerate-qr', authMiddleware, resolveEffectiveUserId, campaignController.regenerateCampaignQR);

module.exports = router;