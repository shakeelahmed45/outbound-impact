// ═══════════════════════════════════════════════════════════
// routes/auditRoutes.js
// Enterprise audit log endpoints
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const auditController = require('../controllers/auditController');

// GET /api/audit/logs — paginated, filterable audit logs
router.get('/logs', authMiddleware, resolveEffectiveUserId, auditController.getAuditLogs);

// GET /api/audit/stats — summary stats for audit dashboard header
router.get('/stats', authMiddleware, resolveEffectiveUserId, auditController.getAuditStats);

module.exports = router;