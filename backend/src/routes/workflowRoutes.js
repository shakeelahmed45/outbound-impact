const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');
const workflowController = require('../controllers/workflowController');

// All workflow routes require authentication
router.use(authMiddleware);
router.use(resolveEffectiveUserId);

// Workflow CRUD
router.get('/', workflowController.getWorkflows);
router.post('/', workflowController.createWorkflow);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

// Workflow actions
router.post('/:id/submit', workflowController.submitForReview);
router.post('/:id/approve', workflowController.approveWorkflow);
router.post('/:id/request-changes', workflowController.requestChanges);

module.exports = router;