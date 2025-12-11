const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verify user has organization role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'ORG_SMALL' && user.role !== 'ORG_MEDIUM' && user.role !== 'ORG_ENTERPRISE')) {
      return res.status(403).json({
        status: 'error',
        message: 'Team features are only available for organization plans',
      });
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      orderBy: { invitedAt: 'desc' },
    });

    res.json({
      status: 'success',
      teamMembers,
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team members',
    });
  }
};

const inviteTeamMember = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and role are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    // Validate role
    const validRoles = ['VIEWER', 'EDITOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN',
      });
    }

    // Verify user has organization role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    if (!user || (user.role !== 'ORG_SMALL' && user.role !== 'ORG_MEDIUM' && user.role !== 'ORG_ENTERPRISE')) {
      return res.status(403).json({
        status: 'error',
        message: 'Team features are only available for organization plans',
      });
    }

    // Check if member already exists
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        email,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: 'This team member has already been invited',
      });
    }

    // Create team member
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        email,
        role,
      },
    });

    // TODO: Send invitation email
    // This would require email service setup (Nodemailer, SendGrid, etc.)
    // Example:
    // await sendInvitationEmail({
    //   to: email,
    //   inviterName: user.name,
    //   inviterEmail: user.email,
    //   role: role,
    // });

    console.log(`✅ Team member invited: ${email} as ${role} by ${user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Team member invited successfully',
      teamMember,
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to invite team member',
    });
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify team member exists and belongs to this user
    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

    // Delete team member
    await prisma.teamMember.delete({
      where: { id },
    });

    console.log(`✅ Team member removed: ${teamMember.email}`);

    res.json({
      status: 'success',
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove team member',
    });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        status: 'error',
        message: 'Role is required',
      });
    }

    // Validate role
    const validRoles = ['VIEWER', 'EDITOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN',
      });
    }

    // Verify team member exists and belongs to this user
    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

    // Update team member
    const updatedMember = await prisma.teamMember.update({
      where: { id },
      data: { role },
    });

    console.log(`✅ Team member role updated: ${updatedMember.email} to ${role}`);

    res.json({
      status: 'success',
      message: 'Team member updated successfully',
      teamMember: updatedMember,
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update team member',
    });
  }
};

module.exports = {
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
};