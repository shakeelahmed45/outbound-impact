const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to resolve the effective user ID
 * - For team members: Returns organization owner's ID
 * - For regular users: Returns their own ID
 * 
 * This ensures team members access their organization's data, not their personal data
 */
const resolveEffectiveUserId = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Check if user is a team member of any organization
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        memberUserId: userId,
        status: 'ACCEPTED',
      },
      select: {
        userId: true,  // This is the organization owner's ID
        role: true,    // Team member's role (VIEWER, EDITOR, ADMIN)
      },
    });

    if (teamMembership) {
      // User is a team member - use organization owner's ID
      req.effectiveUserId = teamMembership.userId;
      req.isTeamMember = true;
      req.teamRole = teamMembership.role;
      
      console.log(`🔄 Team member (${req.teamRole}) accessing organization data: ${teamMembership.userId}`);
    } else {
      // Regular user - use their own ID
      req.effectiveUserId = userId;
      req.isTeamMember = false;
      req.teamRole = null;
    }

    next();
  } catch (error) {
    console.error('Resolve effective user ID error:', error);
    // On error, use the user's own ID as fallback
    req.effectiveUserId = req.user.userId;
    req.isTeamMember = false;
    req.teamRole = null;
    next();
  }
};

module.exports = { resolveEffectiveUserId };