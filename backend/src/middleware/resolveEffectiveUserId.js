const prisma = require('../lib/prisma');

/**
 * Middleware: resolveEffectiveUserId
 * 
 * Resolves identity AND organization scope for every authenticated request.
 * 
 * ═══════════════════════════════════════════════════════════════
 * FOR ACCOUNT OWNERS (regular users):
 * ═══════════════════════════════════════════════════════════════
 *   req.effectiveUserId = their own user ID
 *   req.isTeamMember    = false
 *   req.teamRole        = null
 *   req.teamMemberId    = null
 *   req.orgScope         = null  (no filtering — sees everything)
 *   req.orgNames         = null
 * 
 * ═══════════════════════════════════════════════════════════════
 * FOR TEAM MEMBERS:
 * ═══════════════════════════════════════════════════════════════
 *   req.effectiveUserId = organization OWNER's user ID
 *   req.isTeamMember    = true
 *   req.teamRole        = 'VIEWER' | 'EDITOR' | 'ADMIN'
 *   req.teamMemberId    = TeamMember record ID (for OrganizationMember lookup)
 *   req.orgScope         = ['org-id-1', 'org-id-2'] or null
 *   req.orgNames         = ['Math Dept', 'Science Dept'] or null
 * 
 * ═══════════════════════════════════════════════════════════════
 * SCOPING RULES:
 * ═══════════════════════════════════════════════════════════════
 *   - Team member assigned to org(s): orgScope = array of org IDs
 *     → Controllers use buildOrgFilter(req) to filter content queries
 *     → Only content with matching organizationId is returned
 * 
 *   - Team member NOT assigned to any org: orgScope = null
 *     → Backward compatible: sees all owner's content (no filtering)
 *     → Owner should assign them to an org to restrict access
 * 
 *   - Account owner: orgScope = null
 *     → Always sees everything, no filtering ever applied
 * 
 * ═══════════════════════════════════════════════════════════════
 * ROLE PERMISSIONS:
 * ═══════════════════════════════════════════════════════════════
 *   VIEWER: View only. Cannot create, edit, or delete anything.
 *           Billing & account pages restricted.
 *   EDITOR: View + create + edit content. Cannot delete.
 *           Billing & account pages restricted.
 *   ADMIN:  Full access within their org scope.
 *           Can manage team, approve workflows, etc.
 */
const resolveEffectiveUserId = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // ─── Check if user is a team member ───
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        memberUserId: userId,
        status: 'ACCEPTED',
      },
      select: {
        id: true,       // TeamMember record ID (needed for OrganizationMember lookup)
        userId: true,   // Organization owner's user ID
        role: true,     // VIEWER | EDITOR | ADMIN
      },
    });

    if (teamMembership) {
      // ═══ TEAM MEMBER ═══
      req.effectiveUserId = teamMembership.userId;
      req.isTeamMember = true;
      req.teamRole = teamMembership.role;
      req.teamMemberId = teamMembership.id;

      // ─── Resolve organization scope ───
      // Look up which orgs this team member is assigned to
      const orgAssignments = await prisma.organizationMember.findMany({
        where: { teamMemberId: teamMembership.id },
        select: {
          organizationId: true,
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (orgAssignments.length > 0) {
        // Assigned to specific org(s) → scope their access
        req.orgScope = orgAssignments.map(a => a.organizationId);
        req.orgNames = orgAssignments.map(a => a.organization.name);
      } else {
        // Not assigned to any org → backward compatible, see everything
        req.orgScope = null;
        req.orgNames = null;
      }

      console.log(
        `🔄 Team member [${req.teamRole}] | ` +
        `Owner: ${teamMembership.userId.slice(0, 8)}... | ` +
        `Org scope: ${req.orgScope ? req.orgScope.length + ' org(s) → ' + req.orgNames.join(', ') : 'ALL (no org assigned)'}`
      );

    } else {
      // ═══ ACCOUNT OWNER ═══
      req.effectiveUserId = userId;
      req.isTeamMember = false;
      req.teamRole = null;
      req.teamMemberId = null;
      req.orgScope = null;
      req.orgNames = null;
    }

    next();
  } catch (error) {
    console.error('❌ resolveEffectiveUserId error:', error);
    // Fallback: treat as regular user with no scope
    req.effectiveUserId = req.user.userId;
    req.isTeamMember = false;
    req.teamRole = null;
    req.teamMemberId = null;
    req.orgScope = null;
    req.orgNames = null;
    next();
  }
};

module.exports = { resolveEffectiveUserId };