// backend/src/controllers/teamInvitationController.js

const prisma = require('../lib/prisma');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

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
      where: { email: email.toLowerCase().trim() },
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
        email: email.toLowerCase().trim(),
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
        email: email.toLowerCase().trim(),
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

    // ✅ FIXED: Proper URL format and email sending
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation/${token}`;
    
    console.log('📧 Sending invitation email to:', email);
    console.log('🔗 Invitation link:', inviteLink);

    try {
      // Send invitation email using sendAdminTeamInvitationEmail
      const emailResult = await emailService.sendAdminTeamInvitationEmail({
        email: email.toLowerCase().trim(),
        role: role,
        inviterName: invitation.inviter.name,
        invitationLink: inviteLink,
        expiresAt: invitation.expiresAt
      });

      if (emailResult.success) {
        console.log('✅ Invitation email sent successfully to:', email);
      } else {
        console.error('❌ Failed to send invitation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // Don't fail the whole request if email fails
      // Invitation is still created and link is logged
    }

    res.json({
      status: 'success',
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
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
// GET INVITATION BY TOKEN (for accept invitation page)
// ═══════════════════════════════════════════════════════════
const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Find invitation
    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation token',
      });
    }

    // Check if already used
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has already been used or expired',
      });
    }

    // Check if expired
    const isExpired = new Date() > invitation.expiresAt;
    if (isExpired) {
      await prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has expired',
      });
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase().trim() },
    });

    // Calculate days remaining
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((invitation.expiresAt - now) / (1000 * 60 * 60 * 24)));

    // Return invitation details (without sensitive data)
    res.json({
      status: 'success',
      invitation: {
        email: invitation.email,
        role: invitation.role,
        inviterName: invitation.inviter.name,
        organizationName: 'Outbound Impact Admin Team',
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        isExpired: false,
        daysRemaining,
      },
      userExists: !!existingUser,
    });
  } catch (error) {
    console.error('Get invitation by token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch invitation details',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ACCEPT INVITATION WITH TOKEN IN URL PARAMS (matches frontend)
// ═══════════════════════════════════════════════════════════
const acceptInvitationWithParams = async (req, res) => {
  try {
    const { token } = req.params;  // ✅ Token from URL
    const { name, password } = req.body;

    console.log('📝 Accept invitation request:', { token: token?.substring(0, 10) + '...', name });

    if (!name || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and password are required',
      });
    }

    // Find invitation
    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      console.log('❌ Invalid invitation token');
      return res.status(404).json({
        status: 'error',
        message: 'Invalid invitation token',
      });
    }

    if (invitation.status !== 'PENDING') {
      console.log('❌ Invitation already used:', invitation.status);
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
      console.log('❌ Invitation expired');
      return res.status(400).json({
        status: 'error',
        message: 'Invitation has expired',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase().trim() },
    });

    if (existingUser) {
      console.log('❌ User already exists:', invitation.email);
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
        email: invitation.email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        role: invitation.role,
        status: 'active',
      },
    });

    console.log('✅ User created:', { id: user.id, email: user.email, role: user.role });

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

    console.log('✅ Invitation accepted successfully for:', user.email);

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
// ACCEPT INVITATION (LEGACY - token in body)
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
// DECLINE INVITATION
// ═══════════════════════════════════════════════════════════
const declineInvitation = async (req, res) => {
  try {
    const { token } = req.params;

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
        message: 'This invitation has already been processed',
      });
    }

    await prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED' },
    });

    console.log('❌ Invitation declined:', invitation.email);

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

// ═══════════════════════════════════════════════════════════
// RESEND INVITATION
// ═══════════════════════════════════════════════════════════
const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await prisma.adminInvitation.findUnique({
      where: { id: invitationId },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

    // ✅ FIXED: Proper URL format and email sending
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation/${newToken}`;
    
    console.log('📧 Resending invitation email to:', invitation.email);
    console.log('🔗 New invitation link:', inviteLink);

    try {
      // Send invitation email using sendAdminTeamInvitationEmail
      const emailResult = await emailService.sendAdminTeamInvitationEmail({
        email: invitation.email,
        role: invitation.role,
        inviterName: invitation.inviter.name,
        invitationLink: inviteLink,
        expiresAt: newExpiresAt
      });

      if (emailResult.success) {
        console.log('✅ Invitation email resent successfully');
      } else {
        console.error('❌ Failed to resend invitation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Failed to resend invitation email:', emailError);
    }

    res.json({
      status: 'success',
      message: 'Invitation resent successfully',
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
        AND: [
          {
            OR: [
              { role: 'ADMIN' },
              { role: 'CUSTOMER_SUPPORT' },
            ],
          },
          // ✅ FIXED: Exclude deleted users
          {
            OR: [
              { status: null },
              { status: 'active' },
            ],
          },
          // ✅ Also exclude users with scrambled deleted emails
          {
            NOT: {
              email: { contains: '@deleted.local' }
            }
          }
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
      active: teamMembers.filter(m => !m.status || m.status === 'active').length,
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
// REMOVE TEAM MEMBER (HARD DELETE)
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

    // Get user info before deletion
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!userToDelete) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    console.log(`🗑️ Removing team member: ${userToDelete.email} (${userToDelete.role})`);

    // ✅ Delete related AdminInvitation records first (if any)
    try {
      await prisma.adminInvitation.deleteMany({
        where: { email: userToDelete.email.toLowerCase() }
      });
      console.log(`✅ Deleted related invitations for: ${userToDelete.email}`);
    } catch (inviteError) {
      console.log(`ℹ️ No invitations found for: ${userToDelete.email}`);
    }

    // ✅ HARD DELETE the user - completely removes from database
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`✅ Team member PERMANENTLY deleted: ${userToDelete.email}`);

    res.json({
      status: 'success',
      message: 'Team member permanently removed',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === 'P2003') {
      // If hard delete fails due to foreign keys, do soft delete instead
      try {
        await prisma.user.update({
          where: { id: req.params.userId },
          data: {
            status: 'deleted',
            deletedAt: new Date(),
            // Scramble email to prevent login
            email: `deleted_${Date.now()}_${req.params.userId}@deleted.local`,
          },
        });
        
        console.log(`⚠️ Soft deleted user due to dependencies: ${req.params.userId}`);
        
        return res.json({
          status: 'success',
          message: 'Team member removed (account deactivated)',
        });
      } catch (softDeleteError) {
        console.error('Soft delete also failed:', softDeleteError);
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove team member',
    });
  }
};

module.exports = {
  inviteTeamMember,
  getAllInvitations,
  getInvitationByToken,
  acceptInvitation,
  acceptInvitationWithParams,  // ✅ NEW
  declineInvitation,           // ✅ NEW
  resendInvitation,
  deleteInvitation,
  getAllTeamMembers,
  removeTeamMember,
};