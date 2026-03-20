const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const ctrl    = require('../controllers/enterpriseLeadController');

// ── Public routes (no auth) ───────────────────────────────────
// Prospect submits the enquiry form on Plans page
router.post('/', ctrl.submitLead);

// Prospect's signup page fetches their plan details by secure token
// Must be defined BEFORE /:id to avoid conflict
router.get('/by-token/:token', ctrl.getLeadByToken);

// ── Admin only ────────────────────────────────────────────────
router.use(auth);
router.use(requireAdmin);

router.get('/',        ctrl.getLeads);
router.get('/:id',     ctrl.getLeadById);
router.patch('/:id',   ctrl.updateLead);
router.delete('/:id',  ctrl.deleteLead);

// Admin sends signup+checkout link to prospect
router.post('/:id/send-checkout', ctrl.sendCheckoutLink);

module.exports = router;