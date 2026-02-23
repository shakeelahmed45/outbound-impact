// ═══════════════════════════════════════════════════════════
// routes/complianceRoutes.js
// Enterprise compliance endpoints
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const complianceController = require('../controllers/complianceController');

// GET /api/compliance/campaigns — per-campaign compliance with issues
router.get('/campaigns', authMiddleware, resolveEffectiveUserId, complianceController.getCampaignCompliance);

// GET /api/compliance/summary — overall compliance stats
router.get('/summary', authMiddleware, resolveEffectiveUserId, complianceController.getComplianceSummary);

module.exports = router;