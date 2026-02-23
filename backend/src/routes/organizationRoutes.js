const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const ctrl = require('../controllers/organizationController');

router.use(authMiddleware);
router.use(resolveEffectiveUserId);

// Unassigned content (must be before /:id routes)
router.get('/unassigned', ctrl.getUnassigned);

// CRUD
router.get('/', ctrl.getOrganizations);
router.get('/:id', ctrl.getOrganizationDetail);
router.post('/', ctrl.createOrganization);
router.put('/:id', ctrl.updateOrganization);
router.delete('/:id', ctrl.deleteOrganization);

// Assign / Remove content
router.post('/:id/assign-items', ctrl.assignItems);
router.post('/:id/remove-items', ctrl.removeItems);
router.post('/:id/assign-streams', ctrl.assignStreams);
router.post('/:id/remove-streams', ctrl.removeStreams);
router.post('/:id/assign-cohorts', ctrl.assignCohorts);
router.post('/:id/remove-cohorts', ctrl.removeCohorts);
router.post('/:id/assign-members', ctrl.assignMembers);
router.post('/:id/remove-members', ctrl.removeMembers);

module.exports = router;