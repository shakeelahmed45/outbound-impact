// backend/src/controllers/teamInvitationController.js

const prisma = require('../lib/prisma');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService'); // 🆕 ADD THIS

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

    // ✅ FIXED: Proper URL format and email sending
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation/${token}`;
    
    console.log('📧 Sending invitation email to:', email);
    console.log('🔗 Invitation link:', inviteLink);

    try {
      // Send invitation email
      await emailService.sendEmail({
        to: email,
        subject: `You've been invited to join Outbound Impact Admin Team`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .info-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Admin Team Invitation</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                
                <p><strong>${invitation.inviter.name}</strong> has invited you to join the Outbound Impact admin team as a <strong>${role === 'ADMIN' ? 'Full Admin' : 'Customer Support'}</strong>.</p>
                
                <div class="info-box">
                  <h3>Your Role: ${role === 'ADMIN' ? '👑 Admin' : '💬 Customer Support'}</h3>
                  ${role === 'ADMIN' 
                    ? '<p>As an Admin, you\'ll have full access to manage users, items, analytics, and team members.</p>'
                    : '<p>As Customer Support, you\'ll have access to manage live chat conversations and help users.</p>'
                  }
                </div>
                
                <p>Click the button below to accept the invitation and create your account:</p>
                
                <div style="text-align: center;">
                  <a href="${inviteLink}" class="button">Accept Invitation & Create Account</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
                </p>
                
                <div class="info-box">
                  <p><strong>⏰ Important:</strong> This invitation expires in 7 days (${new Date(expiresAt).toLocaleDateString()}).</p>
                </div>
                
                <p>If you have any questions, please contact the admin who invited you.</p>
              </div>
              <div class="footer">
                <p>© 2026 Outbound Impact. All rights reserved.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log('✅ Invitation email sent successfully to:', email);
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
      // Send invitation email
      await emailService.sendEmail({
        to: invitation.email,
        subject: `Reminder: Admin Team Invitation - Outbound Impact`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .info-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 Invitation Reminder</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                
                <p>This is a reminder that <strong>${invitation.inviter.name}</strong> invited you to join the Outbound Impact admin team.</p>
                
                <div class="info-box">
                  <h3>Your Role: ${invitation.role === 'ADMIN' ? '👑 Admin' : '💬 Customer Support'}</h3>
                </div>
                
                <div style="text-align: center;">
                  <a href="${inviteLink}" class="button">Accept Invitation & Create Account</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Or copy and paste this link:<br>
                  <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
                </p>
                
                <div class="info-box">
                  <p><strong>⏰ New Expiry:</strong> This invitation now expires on ${new Date(newExpiresAt).toLocaleDateString()}.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log('✅ Invitation email resent successfully');
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