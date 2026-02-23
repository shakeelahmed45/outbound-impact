const prisma = require('../lib/prisma');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendTeamInvitationEmail, sendInvitationReminderEmail } = require('../services/emailService');
const { notifyTeamInviteSent, notifyTeamMemberJoined, notifyTeamMemberRemoved } = require('../services/notificationService');

// Generate unique invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ✅ REMOVED RESTRICTION - Team features now available for ALL plans including INDIVIDUAL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
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
    const { email, role, message } = req.body; // ✨ Added message field

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

    // ✅ REMOVED RESTRICTION - Team features now available for ALL plans including INDIVIDUAL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // ✅ STRICT: Individual plan → 2 contributors max
    if (user.role === 'INDIVIDUAL') {
      const teamCount = await prisma.teamMember.count({ where: { userId } });
      if (teamCount >= 2) {
        return res.status(403).json({
          status: 'error',
          message: 'Contributor limit reached (2/2). Please upgrade your plan to invite more team members.'
        });
      }
    }

    // ✅ CRITICAL CHECK: Prevent inviting already registered emails (case-insensitive)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
        email: normalizedEmail,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: 'This email has already been invited to your team',
      });
    }

    // Generate invitation token
    const token = generateInvitationToken();

    // Create team member with PENDING status and normalized email
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        email: normalizedEmail,
        role,
        status: 'PENDING',
        token,
        message: message || null, // ✨ Save custom message
      },
    });

    // Create invitation link
    const baseUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const invitationLink = `${baseUrl}/accept-invitation/${token}`;

    // Send invitation email with proper error handling
    let emailSent = false;
    try {
      const emailResult = await sendTeamInvitationEmail({
        recipientEmail: normalizedEmail,
        inviterName: user.name,
        inviterEmail: user.email,
        role: role,
        invitationLink: invitationLink,
        message: message || null, // ✨ Include custom message
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

    // 🔔 Notify: invitation sent
    await notifyTeamInviteSent(userId, normalizedEmail, role);

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
        recipientEmail: teamMember.email,
        inviterName: user.name,
        inviterEmail: user.email,
        role: teamMember.role,
        invitationLink: invitationLink,
        message: teamMember.message || null, // ✨ Include original message
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

    // Check for existing user with normalized email (case-insensitive)
    const normalizedEmail = teamMember.email.toLowerCase().trim();
    
    let memberUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

      // Create new user with normalized email
      memberUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
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

    // 🔔 Notify org owner: new member joined
    await notifyTeamMemberJoined(teamMember.userId, memberUser.name, normalizedEmail);

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

    // Check for existing user with normalized email
    const normalizedEmail = teamMember.email.toLowerCase().trim();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    // 🔔 Notify: team member removed
    await notifyTeamMemberRemoved(userId, teamMember.email);

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

// ✅ NEW: Update team member role (for role editor dropdown)
const updateTeamMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    console.log('🔄 UPDATE ROLE REQUEST:', {
      teamMemberId: id,
      newRole: role,
      requestedBy: userId
    });

    // Validate role
    const validRoles = ['VIEWER', 'EDITOR', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN'
      });
    }

    // Get the team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { 
        id,
        userId // Ensure user owns this team member
      }
    });

    if (!teamMember) {
      console.log('❌ Team member not found or no permission:', id);
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    // Check if the current user is the owner
    if (teamMember.userId !== userId) {
      console.log('❌ Permission denied:', {
        teamMemberUserId: teamMember.userId,
        requestUserId: userId
      });
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this team member'
      });
    }

    // Store old role for logging
    const oldRole = teamMember.role;

    // Update the role
    const updatedMember = await prisma.teamMember.update({
      where: { id },
      data: { role }
    });

    console.log('✅ Role updated successfully:', {
      teamMemberId: id,
      email: updatedMember.email,
      oldRole: oldRole,
      newRole: role
    });

    res.json({
      status: 'success',
      message: 'Team member role updated successfully',
      teamMember: updatedMember
    });

  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update team member role'
    });
  }
};

// ✅ REQUEST ROLE CHANGE — Used by team members (especially VIEWERs)
const requestRoleChange = async (req, res) => {
  try {
    const userId = req.user.userId; // The actual logged-in team member
    const { requestedRole, note } = req.body;

    if (!requestedRole) {
      return res.status(400).json({ status: 'error', message: 'Requested role is required' });
    }

    const validRoles = ['VIEWER', 'EDITOR', 'ADMIN'];
    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    // Find this user's team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: { memberUserId: userId, status: 'ACCEPTED' },
    });

    if (!teamMember) {
      return res.status(404).json({ status: 'error', message: 'You are not a team member of any organization' });
    }

    // Don't allow requesting same role
    if (teamMember.role === requestedRole) {
      return res.status(400).json({ status: 'error', message: `You already have the ${requestedRole} role` });
    }

    // Check if already requested
    if (teamMember.roleChangeRequested) {
      return res.status(400).json({ status: 'error', message: 'You already have a pending role change request' });
    }

    await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: {
        roleChangeRequested: true,
        requestedRole,
        roleChangeNote: note?.trim() || null,
        roleChangeRequestedAt: new Date(),
      },
    });

    console.log(`📩 Role change requested: ${teamMember.email} wants ${requestedRole} (currently ${teamMember.role})`);

    res.json({
      status: 'success',
      message: 'Role change request submitted. The organization owner will review your request.',
    });
  } catch (error) {
    console.error('Request role change error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit role change request' });
  }
};

// ✅ DISMISS ROLE REQUEST — Used by org owner to clear request (without changing role)
const dismissRoleRequest = async (req, res) => {
  try {
    const userId = req.user.userId; // Org owner
    const { id } = req.params; // TeamMember ID

    const teamMember = await prisma.teamMember.findFirst({
      where: { id, userId },
    });

    if (!teamMember) {
      return res.status(404).json({ status: 'error', message: 'Team member not found' });
    }

    await prisma.teamMember.update({
      where: { id },
      data: {
        roleChangeRequested: false,
        requestedRole: null,
        roleChangeNote: null,
        roleChangeRequestedAt: null,
      },
    });

    console.log(`❌ Role change request dismissed for: ${teamMember.email}`);

    res.json({ status: 'success', message: 'Role change request dismissed' });
  } catch (error) {
    console.error('Dismiss role request error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to dismiss request' });
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
  updateTeamMemberRole, // ✅ NEW: Export the new function
  requestRoleChange,
  dismissRoleRequest,
};