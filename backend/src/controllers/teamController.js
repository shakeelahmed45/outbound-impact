const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

    const existingMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        email,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member already exists',
      });
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        email,
        role,
      },
    });

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

    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

    await prisma.teamMember.delete({
      where: { id },
    });

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

module.exports = {
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
};