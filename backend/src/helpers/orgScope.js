/**
 * Organization Scope Helper
 * 
 * Shared utility functions used by ALL controllers to:
 *   1. Filter content queries by org scope (READ operations)
 *   2. Auto-assign new content to the team member's org (CREATE operations)
 *   3. Check if a request has org scope (conditional logic)
 * 
 * ═══════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 * ═══════════════════════════════════════════════════════════════
 * 
 * The resolveEffectiveUserId middleware sets req.orgScope on every request.
 * Controllers call these helpers to apply org filtering automatically.
 * 
 * Example usage in any controller:
 * 
 *   const { buildOrgFilter, getAutoAssignOrgId } = require('../helpers/orgScope');
 * 
 *   // READ: Filter items to only show org-scoped content
 *   const orgFilter = buildOrgFilter(req);
 *   const items = await prisma.item.findMany({
 *     where: { userId, ...orgFilter },
 *   });
 * 
 *   // CREATE: Auto-assign new content to team member's org
 *   const campaign = await prisma.campaign.create({
 *     data: {
 *       userId,
 *       name,
 *       organizationId: req.body.organizationId || getAutoAssignOrgId(req),
 *     },
 *   });
 * 
 * ═══════════════════════════════════════════════════════════════
 * RETURN VALUES:
 * ═══════════════════════════════════════════════════════════════
 * 
 * buildOrgFilter(req):
 *   - Account owner (orgScope = null):       returns {}  (no filtering)
 *   - Team member with org assignment:       returns { organizationId: { in: ['id1', 'id2'] } }
 *   - Team member without org assignment:    returns {}  (backward compat, no filtering)
 * 
 * getAutoAssignOrgId(req):
 *   - Account owner:                         returns null
 *   - Team member with 1 org:                returns that org's ID
 *   - Team member with multiple orgs:        returns first org's ID (frontend can override)
 *   - Team member with no org:               returns null
 */

/**
 * Build org filter for content queries (items, campaigns, cohorts).
 * These models have an `organizationId` field directly on them.
 * 
 * @param {Object} req - Express request (must have run through resolveEffectiveUserId)
 * @returns {Object} Prisma where clause addition, or empty object
 */
const buildOrgFilter = (req) => {
  // No orgScope means no filtering (account owner or unscoped team member)
  if (!req.orgScope || req.orgScope.length === 0) return {};

  // Filter to only content assigned to the team member's org(s)
  return { organizationId: { in: req.orgScope } };
};

/**
 * Get the org ID to auto-assign when creating new content.
 * Used in create operations so new content belongs to the team member's org.
 * 
 * @param {Object} req - Express request
 * @returns {String|null} Organization ID or null
 */
const getAutoAssignOrgId = (req) => {
  if (!req.orgScope || req.orgScope.length === 0) return null;

  // If team member has exactly 1 org, use it
  // If multiple orgs, use the first one (frontend can override via req.body.organizationId)
  return req.orgScope[0];
};

/**
 * Check if the current request has org scope applied.
 * Useful for conditional logic in controllers.
 * 
 * @param {Object} req - Express request
 * @returns {Boolean}
 */
const hasOrgScope = (req) => {
  return Array.isArray(req.orgScope) && req.orgScope.length > 0;
};

module.exports = {
  buildOrgFilter,
  getAutoAssignOrgId,
  hasOrgScope,
};