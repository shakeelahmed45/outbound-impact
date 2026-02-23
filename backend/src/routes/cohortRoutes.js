const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const cohortController = require('../controllers/cohortController');

// ═══════════════════════════════════════════════
// PUBLIC ROUTES (no auth - for QR code scanning)
// ═══════════════════════════════════════════════
router.get('/public/:slug', cohortController.getPublicCohort);

// ═══════════════════════════════════════════════
// PROTECTED ROUTES (require login)
// ═══════════════════════════════════════════════
router.use(authMiddleware);
router.use(resolveEffectiveUserId);

// Cohort CRUD
router.get('/', cohortController.getCohorts);
router.post('/', cohortController.createCohort);
router.put('/:id', cohortController.updateCohort);
router.delete('/:id', cohortController.deleteCohort);

// Cohort Members
router.get('/:id/members', cohortController.getMembers);
router.post('/:id/members', cohortController.addMembers);
router.post('/:id/members/import', cohortController.importMembers);
router.delete('/:id/members/:memberId', cohortController.removeMember);

// Cohort Streams (assign campaigns)
router.get('/:id/streams', cohortController.getStreams);
router.post('/:id/streams', cohortController.assignStreams);
router.delete('/:id/streams/:assignmentId', cohortController.removeStream);

module.exports = router;