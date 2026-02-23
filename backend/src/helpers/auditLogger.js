// ═══════════════════════════════════════════════════════════
// helpers/auditLogger.js
// Fire-and-forget audit logging utility
// Usage: await logAudit(req, 'ITEM_CREATED', { itemId, title })
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log an action to the AuditLog table.
 * 
 * @param {Object} req       — Express request (extracts userId, IP, device)
 * @param {string} action    — Action name, e.g. 'ITEM_CREATED', 'CAMPAIGN_DELETED'
 * @param {Object} metadata  — Optional JSON metadata (itemId, title, old/new values, etc.)
 * @param {string} overrideUserId — Optional: use this instead of req.user.userId (for system actions)
 */
const logAudit = async (req, action, metadata = {}, overrideUserId = null) => {
  try {
    const userId = overrideUserId || req?.user?.userId;
    if (!userId) return; // Can't log without a user

    // Extract IP address
    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req?.headers?.['x-real-ip']
      || req?.socket?.remoteAddress
      || null;

    // Extract device/user-agent
    const device = req?.headers?.['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        ipAddress,
        device,
        metadata: metadata || {},
      }
    });
  } catch (err) {
    // Fire-and-forget: never let audit logging break the main request
    console.error('⚠️ Audit log failed (non-blocking):', err.message);
  }
};

// ═══════════════════════════════════════════════════════════
// ACTION CONSTANTS
// Organized by category for easy reference
// ═══════════════════════════════════════════════════════════

const AUDIT_ACTIONS = {
  // Content / Items
  ITEM_CREATED: 'ITEM_CREATED',
  ITEM_UPDATED: 'ITEM_UPDATED',
  ITEM_DELETED: 'ITEM_DELETED',

  // Campaigns / Streams
  CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED: 'CAMPAIGN_UPDATED',
  CAMPAIGN_DELETED: 'CAMPAIGN_DELETED',
  CAMPAIGN_ITEM_ADDED: 'CAMPAIGN_ITEM_ADDED',
  CAMPAIGN_ITEM_REMOVED: 'CAMPAIGN_ITEM_REMOVED',

  // Uploads
  FILE_UPLOADED: 'FILE_UPLOADED',
  TEXT_POST_CREATED: 'TEXT_POST_CREATED',
  EMBED_POST_CREATED: 'EMBED_POST_CREATED',

  // Cohorts
  COHORT_CREATED: 'COHORT_CREATED',
  COHORT_UPDATED: 'COHORT_UPDATED',
  COHORT_DELETED: 'COHORT_DELETED',
  COHORT_MEMBER_ADDED: 'COHORT_MEMBER_ADDED',
  COHORT_MEMBER_REMOVED: 'COHORT_MEMBER_REMOVED',
  COHORT_MEMBERS_IMPORTED: 'COHORT_MEMBERS_IMPORTED',
  COHORT_STREAMS_ASSIGNED: 'COHORT_STREAMS_ASSIGNED',

  // Workflows
  WORKFLOW_CREATED: 'WORKFLOW_CREATED',
  WORKFLOW_SUBMITTED: 'WORKFLOW_SUBMITTED',
  WORKFLOW_APPROVED: 'WORKFLOW_APPROVED',
  WORKFLOW_CHANGES_REQUESTED: 'WORKFLOW_CHANGES_REQUESTED',
  WORKFLOW_UPDATED: 'WORKFLOW_UPDATED',
  WORKFLOW_DELETED: 'WORKFLOW_DELETED',

  // Organizations
  ORG_CREATED: 'ORG_CREATED',
  ORG_UPDATED: 'ORG_UPDATED',
  ORG_DELETED: 'ORG_DELETED',
  ORG_MEMBER_ASSIGNED: 'ORG_MEMBER_ASSIGNED',
  ORG_MEMBER_REMOVED: 'ORG_MEMBER_REMOVED',

  // Team
  TEAM_MEMBER_INVITED: 'TEAM_MEMBER_INVITED',
  TEAM_MEMBER_REMOVED: 'TEAM_MEMBER_REMOVED',
  TEAM_ROLE_CHANGED: 'TEAM_ROLE_CHANGED',
  TEAM_INVITATION_ACCEPTED: 'TEAM_INVITATION_ACCEPTED',

  // Account / Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',

  // Security
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',

  // Subscription
  SUBSCRIPTION_UPGRADED: 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
};

module.exports = { logAudit, AUDIT_ACTIONS };