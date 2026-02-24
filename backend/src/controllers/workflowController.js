const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const getSubmitterInfo = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    return { name: user?.name || 'Unknown', email: user?.email || '' };
  } catch {
    return { name: 'Unknown', email: '' };
  }
};

// ═══════════════════════════════════════════════
// GET /api/workflows — List all workflows
// ═══════════════════════════════════════════════
const getWorkflows = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const stats = {
      total: workflows.length,
      draft: workflows.filter(w => w.status === 'DRAFT').length,
      pending: workflows.filter(w => w.status === 'PENDING_REVIEW').length,
      approved: workflows.filter(w => w.status === 'APPROVED').length,
      needsChanges: workflows.filter(w => w.status === 'NEEDS_CHANGES').length,
    };

    res.json({
      status: 'success',
      workflows,
      stats,
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch workflows' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/workflows — Create new workflow
// ═══════════════════════════════════════════════
const createWorkflow = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const actualUserId = req.user.userId; // The actual logged-in user
    const { assetName, assetType, assetUrl, itemId, campaignId, submitNow } = req.body;

    // VIEWER team members cannot create workflows
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to create workflows' });
    }

    if (!assetName || !assetName.trim()) {
      return res.status(400).json({ status: 'error', message: 'Asset name is required' });
    }

    // Get submitter info
    const submitter = await getSubmitterInfo(actualUserId);

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        submittedById: actualUserId,
        submittedByName: submitter.name,
        submittedByEmail: submitter.email,
        assetName: assetName.trim(),
        assetType: assetType || null,
        assetUrl: assetUrl || null,
        itemId: itemId || null,
        campaignId: campaignId || null,
        status: submitNow ? 'PENDING_REVIEW' : 'DRAFT',
        submittedAt: submitNow ? new Date() : null,
      },
    });

    console.log(`✅ Workflow created: "${workflow.assetName}" (status: ${workflow.status})`);

    res.status(201).json({
      status: 'success',
      message: submitNow ? 'Submitted for review' : 'Draft created',
      workflow,
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create workflow' });
  }
};

// ═══════════════════════════════════════════════
// PUT /api/workflows/:id — Update workflow details
// ═══════════════════════════════════════════════
const updateWorkflow = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { assetName, assetType, assetUrl, itemId, campaignId } = req.body;

    // VIEWER team members cannot edit workflows
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to edit workflows' });
    }

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    // Only allow editing if DRAFT or NEEDS_CHANGES
    if (!['DRAFT', 'NEEDS_CHANGES'].includes(workflow.status)) {
      return res.status(400).json({ status: 'error', message: 'Can only edit drafts or items needing changes' });
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        assetName: assetName?.trim() || workflow.assetName,
        assetType: assetType !== undefined ? assetType : workflow.assetType,
        assetUrl: assetUrl !== undefined ? assetUrl : workflow.assetUrl,
        itemId: itemId !== undefined ? itemId : workflow.itemId,
        campaignId: campaignId !== undefined ? campaignId : workflow.campaignId,
      },
    });

    res.json({ status: 'success', message: 'Workflow updated', workflow: updated });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update workflow' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/workflows/:id/submit — Submit for review
// ═══════════════════════════════════════════════
const submitForReview = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    // VIEWER team members cannot submit for review
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to submit workflows' });
    }

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    if (!['DRAFT', 'NEEDS_CHANGES'].includes(workflow.status)) {
      return res.status(400).json({ status: 'error', message: 'Can only submit drafts or items needing changes' });
    }

    // Bump version if resubmitting after changes
    let newVersion = workflow.version;
    if (workflow.status === 'NEEDS_CHANGES') {
      const parts = workflow.version.replace('v', '').split('.');
      const minor = parseInt(parts[1] || '0') + 1;
      newVersion = `v${parts[0]}.${minor}`;
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        version: newVersion,
        feedback: null, // Clear old feedback
      },
    });

    console.log(`📤 Workflow submitted for review: "${updated.assetName}" (${newVersion})`);

    res.json({ status: 'success', message: 'Submitted for review', workflow: updated });
  } catch (error) {
    console.error('Submit for review error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit for review' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/workflows/:id/approve — Approve workflow
// ═══════════════════════════════════════════════
const approveWorkflow = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const actualUserId = req.user.userId;
    const { id } = req.params;

    // Only org owners (non-team members) and ADMIN team members can approve
    if (req.isTeamMember && req.teamRole !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Only organization owners and admin team members can approve workflows' });
    }

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    if (workflow.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ status: 'error', message: 'Can only approve items pending review' });
    }

    // Get reviewer name
    const reviewer = await getSubmitterInfo(actualUserId);

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewer.name,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // ✅ If linked to an Item, publish it
    if (workflow.itemId) {
      await prisma.item.update({
        where: { id: workflow.itemId },
        data: { status: 'PUBLISHED' },
      }).catch(err => console.error('Failed to publish linked item:', err.message));

      // Notify the editor who uploaded
      if (workflow.submittedById) {
        const { createNotification } = require('../services/notificationService');
        await createNotification(workflow.submittedById, {
          type: 'success',
          category: 'upload',
          title: 'Content Approved! ✅',
          message: `Your upload "${workflow.assetName}" has been approved and is now live.`,
          metadata: { itemId: workflow.itemId, workflowId: workflow.id },
        });
      }
    }

    console.log(`✅ Workflow approved: "${updated.assetName}" by ${reviewer.name}${workflow.itemId ? ' → Item published' : ''}`);

    res.json({ status: 'success', message: 'Content approved', workflow: updated });
  } catch (error) {
    console.error('Approve workflow error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/workflows/:id/request-changes — Request changes
// ═══════════════════════════════════════════════
const requestChanges = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const actualUserId = req.user.userId;
    const { id } = req.params;
    const { feedback } = req.body;

    // Only org owners (non-team members) and ADMIN team members can request changes
    if (req.isTeamMember && req.teamRole !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Only organization owners and admin team members can request changes' });
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: 'error', message: 'Feedback is required when requesting changes' });
    }

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    if (workflow.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ status: 'error', message: 'Can only request changes on items pending review' });
    }

    // Get reviewer name
    const reviewer = await getSubmitterInfo(actualUserId);

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        status: 'NEEDS_CHANGES',
        feedback: feedback.trim(),
        reviewedBy: reviewer.name,
        reviewedAt: new Date(),
        comments: { increment: 1 },
      },
    });

    console.log(`🔄 Changes requested on: "${updated.assetName}" by ${reviewer.name}`);

    // ✅ Notify the editor who submitted
    if (workflow.submittedById) {
      const { createNotification } = require('../services/notificationService');
      await createNotification(workflow.submittedById, {
        type: 'warning',
        category: 'upload',
        title: 'Changes Requested',
        message: `Your submission "${workflow.assetName}" needs changes: "${feedback.trim().substring(0, 100)}${feedback.length > 100 ? '...' : ''}"`,
        metadata: { workflowId: workflow.id, feedback: feedback.trim() },
      });
    }

    res.json({ status: 'success', message: 'Changes requested', workflow: updated });
  } catch (error) {
    console.error('Request changes error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to request changes' });
  }
};

// ═══════════════════════════════════════════════
// DELETE /api/workflows/:id — Delete workflow
// ═══════════════════════════════════════════════
const deleteWorkflow = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    // VIEWER team members cannot delete workflows
    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can delete workflows' });
    }

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    await prisma.workflow.delete({ where: { id } });
    console.log(`🗑️ Workflow deleted: "${workflow.assetName}"`);

    res.json({ status: 'success', message: 'Workflow deleted' });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete workflow' });
  }
};

module.exports = {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  submitForReview,
  approveWorkflow,
  requestChanges,
  deleteWorkflow,
};