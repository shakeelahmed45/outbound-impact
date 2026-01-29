// NEW FILE: backend/src/controllers/teamInvitationController.js

const prisma = require('../lib/prisma');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ═══════════════════════════════════════════════════════════
// INVITE TEAM MEMBER (ADMIN or CUSTOMER_SUPPORT)
// ═══════════════════════════════════════════════════════════
const inviteTeamMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const inviterId = req.user.userId;

    // Validate role
    if (role !== 'ADMIN' && role !== 'CUSTOMER_SUPPORT') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be ADMIN or CUSTOMER_SUPPORT',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    // Check for pending invitation
    const pendingInvite = await prisma.adminInvitation.findFirst({
      where: {
        email,
        status: 'PENDING',
      },
    });

    if (pendingInvite) {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation already sent to this email',
      });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await prisma.adminInvitation.create({
      data: {
        email,
        role,
        token,
        invitedBy: inviterId,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL}/accept-admin-invite?token=${token}`;
    
    // Here you would send an email with the inviteLink
    // For now, we'll return it in the response
    console.log('Invitation link:', inviteLink);

    res.json({
      status: 'success',
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        inviteLink, // Remove this in production, send via email instead
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send invitation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET ALL INVITATIONS
// ═══════════════════════════════════════════════════════════
const getAllInvitations = async (req, res) => {
  try {
    const invitations = await prisma.adminInvitation.findMany({
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: invitations.length,
      pending: invitations.filter(i => i.status === 'PENDING').length,
      accepted: invitations.filter(i => i.status === 'ACCEPTED').length,
      expired: invitations.filter(i => i.status === 'EXPIRED').length,
    };

    res.json({
      status: 'success',
      invitations,
      stats,
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get invitations',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ACCEPT INVITATION & CREATE ACCOUNT
// ═══════════════════════════════════════════════════════════
const acceptInvitation = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    // Find invitation
    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation token',
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation already used or expired',
      });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({
        status: 'error',
        message: 'Invitation has expired',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Account already exists with this email',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    // Generate JWT token
    const authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: 'Account created successfully',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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

// ═══════════════════════════════════════════════════════════
// RESEND INVITATION
// ═══════════════════════════════════════════════════════════
const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await prisma.adminInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invitation not found',
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only resend pending invitations',
      });
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.adminInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL}/accept-admin-invite?token=${newToken}`;
    
    // TODO: Send email with new link

    res.json({
      status: 'success',
      message: 'Invitation resent successfully',
      inviteLink, // Remove in production
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resend invitation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE INVITATION
// ═══════════════════════════════════════════════════════════
const deleteInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    await prisma.adminInvitation.delete({
      where: { id: invitationId },
    });

    res.json({
      status: 'success',
      message: 'Invitation deleted successfully',
    });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete invitation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET ALL TEAM MEMBERS (ADMIN & CUSTOMER_SUPPORT)
// ═══════════════════════════════════════════════════════════
const getAllTeamMembers = async (req, res) => {
  try {
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'CUSTOMER_SUPPORT' },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: teamMembers.length,
      admins: teamMembers.filter(m => m.role === 'ADMIN').length,
      customerSupport: teamMembers.filter(m => m.role === 'CUSTOMER_SUPPORT').length,
      active: teamMembers.filter(m => m.status === 'active').length,
    };

    res.json({
      status: 'success',
      teamMembers,
      stats,
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get team members',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// REMOVE TEAM MEMBER
// ═══════════════════════════════════════════════════════════
const removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot remove yourself',
      });
    }

    // Soft delete - mark as deleted
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
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
  inviteTeamMember,
  getAllInvitations,
  acceptInvitation,
  resendInvitation,
  deleteInvitation,
  getAllTeamMembers,
  removeTeamMember,
};