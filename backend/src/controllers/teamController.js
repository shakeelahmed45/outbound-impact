const prisma = require('../lib/prisma');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
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

    // ✅ NORMALIZE EMAIL TO LOWERCASE
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
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

    // ✅ CRITICAL CHECK: Prevent inviting already registered emails (case-insensitive)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }, // ✅ Use normalized email
      select: { 
        id: true, 
        email: true, 
        name: true,
        _count: {
          select: {
            campaigns: true,
            items: true
          }
        }
      }
    });

    if (existingUser) {
      console.log(`❌ Invitation blocked: ${normalizedEmail} is already registered`);
      console.log(`   User: ${existingUser.name}`);
      console.log(`   Has ${existingUser._count.campaigns} campaigns and ${existingUser._count.items} items`);
      
      return res.status(400).json({
        status: 'error',
        message: `This email (${normalizedEmail}) is already registered in the system. Team invitations can only be sent to new, unregistered email addresses. Please ask the person to use a different email for team membership.`,
        code: 'EMAIL_ALREADY_REGISTERED',
        details: {
          registeredEmail: existingUser.email,
          hasExistingData: (existingUser._count.campaigns > 0 || existingUser._count.items > 0)
        }
      });
    }

    // Check if member already exists (already invited to this team) - case-insensitive
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        email: normalizedEmail, // ✅ Use normalized email
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: 'This email has already been invited to your team',
      });
    }

    // ✨ Generate invitation token
    const token = generateInvitationToken();

    // ✨ Create team member with PENDING status and normalized email
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        email: normalizedEmail, // ✅ Store normalized email
        role,
        status: 'PENDING',
        token,
      },
    });

    // ✨ Create invitation link
    const baseUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const invitationLink = `${baseUrl}/accept-invitation/${token}`;

    // ✨ CRITICAL FIX: Send invitation email with proper error handling
    let emailSent = false;
    try {
      const emailResult = await sendTeamInvitationEmail({
        recipientEmail: normalizedEmail, // ✅ Use normalized email
        inviterName: user.name,
        inviterEmail: user.email,
        role: role,
        invitationLink: invitationLink,
      });

      emailSent = emailResult.success;

      if (!emailResult.success) {
        console.error('❌ Failed to send invitation email:', emailResult.error);
      } else {
        console.log('✅ Invitation email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Email service error:', emailError.message);
      emailSent = false;
    }

    console.log(`✅ Team member invited: ${normalizedEmail} as ${role} by ${user.email}`);
    console.log(`📧 Invitation email sent: ${emailSent ? 'Yes' : 'No (but invitation created)'}`);
    console.log(`🔗 Invitation link: ${invitationLink}`);

    res.status(201).json({
      status: 'success',
      message: emailSent 
        ? 'Team member invited successfully' 
        : 'Team member invited successfully (email delivery pending)',
      teamMember,
      emailSent,
      invitationLink,
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to invite team member',
    });
  }
};

const resendInvitation = async (req, res) => {
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

    if (teamMember.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only resend invitations for pending members',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const newToken = generateInvitationToken();

    await prisma.teamMember.update({
      where: { id },
      data: { token: newToken },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const invitationLink = `${baseUrl}/accept-invitation/${newToken}`;

    let emailSent = false;
    try {
      const emailResult = await sendTeamInvitationEmail({
        recipientEmail: teamMember.email, // Already normalized when created
        inviterName: user.name,
        inviterEmail: user.email,
        role: teamMember.role,
        invitationLink: invitationLink,
      });
      emailSent = emailResult.success;
    } catch (emailError) {
      console.error('Email error:', emailError.message);
    }

    console.log(`🔄 Invitation resent to: ${teamMember.email}`);

    res.json({
      status: 'success',
      message: emailSent 
        ? 'Invitation resent successfully' 
        : 'Invitation link generated (email delivery pending)',
      emailSent,
      invitationLink,
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resend invitation',
    });
  }
};

const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation token is required',
      });
    }

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

    const createdAt = new Date(teamMember.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      return res.status(400).json({
        status: 'error',
        message: 'This invitation has expired',
      });
    }

    // ✅ Check for existing user with normalized email (case-insensitive)
    const normalizedEmail = teamMember.email.toLowerCase().trim();
    
    let memberUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }, // ✅ Use normalized email
    });

    if (!memberUser) {
      if (!name || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Name and password are required for new accounts',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 6 characters',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ Create new user with normalized email
      memberUser = await prisma.user.create({
        data: {
          email: normalizedEmail, // ✅ Store normalized email
          name: name.trim(),
          password: hashedPassword,
          role: 'INDIVIDUAL',
        },
      });

      console.log(`✅ New user account created for team member: ${normalizedEmail}`);
    }

    await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { 
        status: 'ACCEPTED',
        memberUserId: memberUser.id,
      },
    });

    console.log(`✅ Invitation accepted: ${normalizedEmail} joined ${teamMember.user.name}'s team`);

    res.json({
      status: 'success',
      message: 'Invitation accepted successfully',
      teamMember: {
        email: normalizedEmail,
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

const declineInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Invitation token is required',
      });
    }

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

    const createdAt = new Date(teamMember.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const isExpired = daysDiff > 7;

    // ✅ Check for existing user with normalized email
    const normalizedEmail = teamMember.email.toLowerCase().trim();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }, // ✅ Use normalized email
    });

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
      userExists: !!existingUser,
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

    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

    if (teamMember.memberUserId) {
      try {
        await prisma.user.delete({
          where: { id: teamMember.memberUserId }
        });
        console.log(`✅ Team member removed and user account deleted: ${teamMember.email}`);
        console.log(`   Email is now available for new registration`);
      } catch (deleteError) {
        await prisma.teamMember.delete({
          where: { id },
        });
        console.log(`✅ Team member removed: ${teamMember.email}`);
        console.log(`   (User account could not be deleted - may have dependencies)`);
      }
    } else {
      await prisma.teamMember.delete({
        where: { id },
      });
      console.log(`✅ Team member removed: ${teamMember.email}`);
    }

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

    const validRoles = ['VIEWER', 'EDITOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN',
      });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
      });
    }

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
  resendInvitation,
  acceptInvitation,
  declineInvitation,
  getInvitationDetails,
  removeTeamMember,
  updateTeamMember,
};