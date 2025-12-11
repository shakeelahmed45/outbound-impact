const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { sendTeamInvitationEmail, sendInvitationReminderEmail } = require('../services/emailService');

// Generate unique invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

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

    // Get user info for email
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

    // ✨ Generate invitation token
    const token = generateInvitationToken();

    // ✨ Create team member with PENDING status and token
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        email,
        role,
        status: 'PENDING',
        token,
      },
    });

    // ✨ Create invitation link
    const baseUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const invitationLink = `${baseUrl}/accept-invitation/${token}`;

    // ✨ Send invitation email
    const emailResult = await sendTeamInvitationEmail({
      recipientEmail: email,
      inviterName: user.name,
      inviterEmail: user.email,
      role: role,
      invitationLink: invitationLink,
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request, just log the error
    }

    console.log(`✅ Team member invited: ${email} as ${role} by ${user.email}`);
    console.log(`📧 Invitation email sent: ${emailResult.success ? 'Yes' : 'Failed'}`);
    console.log(`🔗 Invitation link: ${invitationLink}`);

    res.status(201).json({
      status: 'success',
      message: 'Team member invited successfully',
      teamMember,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to invite team member',
    });
  }
};

// ✨ NEW: Resend invitation
const resendInvitation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Get team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

    if (teamMember.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only resend invitations for pending members',
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Generate new token
    const newToken = generateInvitationToken();

    // Update token
    await prisma.teamMember.update({
      where: { id },
      data: { token: newToken },
    });

    // Create new invitation link
    const baseUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const invitationLink = `${baseUrl}/accept-invitation/${newToken}`;

    // Resend email
    const emailResult = await sendTeamInvitationEmail({
      recipientEmail: teamMember.email,
      inviterName: user.name,
      inviterEmail: user.email,
      role: teamMember.role,
      invitationLink: invitationLink,
    });

    console.log(`🔄 Invitation resent to: ${teamMember.email}`);

    res.json({
      status: 'success',
      message: 'Invitation resent successfully',
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resend invitation',
    });
  }
};

// ✨ NEW: Accept invitation
const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation token is required',
      });
    }

    // Find team member by token
    const teamMember = await prisma.teamMember.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid or expired invitation',
      });
    }

    if (teamMember.status === 'ACCEPTED') {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has already been accepted',
      });
    }

    if (teamMember.status === 'DECLINED') {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has been declined',
      });
    }

    // Check if invitation is expired (7 days)
    const createdAt = new Date(teamMember.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has expired',
      });
    }

    // Update status to ACCEPTED
    await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { status: 'ACCEPTED' },
    });

    console.log(`✅ Invitation accepted: ${teamMember.email} joined ${teamMember.user.name}'s team`);

    res.json({
      status: 'success',
      message: 'Invitation accepted successfully',
      teamMember: {
        email: teamMember.email,
        role: teamMember.role,
        organizationName: teamMember.user.name,
        organizationEmail: teamMember.user.email,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept invitation',
    });
  }
};

// ✨ NEW: Decline invitation
const declineInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation token is required',
      });
    }

    // Find team member by token
    const teamMember = await prisma.teamMember.findUnique({
      where: { token },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid or expired invitation',
      });
    }

    if (teamMember.status === 'DECLINED') {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has already been declined',
      });
    }

    // Update status to DECLINED
    await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { status: 'DECLINED' },
    });

    console.log(`❌ Invitation declined: ${teamMember.email}`);

    res.json({
      status: 'success',
      message: 'Invitation declined',
    });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to decline invitation',
    });
  }
};

// ✨ NEW: Get invitation details
const getInvitationDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const teamMember = await prisma.teamMember.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation',
      });
    }

    // Check if expired
    const createdAt = new Date(teamMember.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const isExpired = daysDiff > 7;

    res.json({
      status: 'success',
      invitation: {
        email: teamMember.email,
        role: teamMember.role,
        status: teamMember.status,
        organizationName: teamMember.user.name,
        organizationEmail: teamMember.user.email,
        createdAt: teamMember.createdAt,
        isExpired,
        daysRemaining: Math.max(0, 7 - daysDiff),
      },
    });
  } catch (error) {
    console.error('Get invitation details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get invitation details',
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
  resendInvitation,        // ✨ NEW
  acceptInvitation,        // ✨ NEW
  declineInvitation,       // ✨ NEW
  getInvitationDetails,    // ✨ NEW
  removeTeamMember,
  updateTeamMember,
};