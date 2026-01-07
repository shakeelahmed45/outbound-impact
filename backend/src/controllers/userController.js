const prisma = require('../lib/prisma'); // ✅ Use shared Prisma instance
const bcrypt = require('bcryptjs'); // ✅ NEW: Import bcrypt for password hashing

const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { photoData, fileName } = req.body;

    if (!photoData) {
      return res.status(400).json({
        status: 'error',
        message: 'Photo data is required',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: photoData },
    });

    res.json({
      status: 'success',
      message: 'Profile picture updated',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
      },
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload photo',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    res.json({
      status: 'success',
      message: 'Profile updated',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete all user's items
    await prisma.item.deleteMany({
      where: { userId },
    });

    // Delete all campaigns
    await prisma.campaign.deleteMany({
      where: { userId },
    });

    // Delete all team members
    await prisma.teamMember.deleteMany({
      where: { userId },
    });

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account',
    });
  }
};

// ✅ Change user email with normalization
const changeEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'New email is required'
      });
    }

    // ✅ NORMALIZE EMAIL TO LOWERCASE
    const normalizedEmail = newEmail.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    // Check if email already taken (case-insensitive)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail } // ✅ Use normalized email
    });

    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        status: 'error',
        message: 'This email is already registered to another account'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (normalizedEmail === currentUser.email) {
      return res.status(400).json({
        status: 'error',
        message: 'New email is the same as current email'
      });
    }

    // Update email with normalized version
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail }, // ✅ Store normalized email
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        subscriptionStatus: true,
        currentPeriodEnd: true
      }
    });

    console.log(`✅ Email changed: ${currentUser.email} → ${normalizedEmail}`);

    res.json({
      status: 'success',
      message: 'Email changed successfully. Please sign in with your new email.',
      user: {
        ...updatedUser,
        storageUsed: updatedUser.storageUsed.toString(),
        storageLimit: updatedUser.storageLimit.toString()
      }
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change email'
    });
  }
};

// ✅ NEW: Change password function
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Changing password for user:', userId);

    // Validation
    if (!currentPassword || !newPassword) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      console.error('❌ New password too short');
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.email);

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      console.error('❌ Current password incorrect');
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    console.log('✅ Current password verified');

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      console.error('❌ New password same as current');
      return res.status(400).json({
        status: 'error',
        message: 'New password must be different from current password'
      });
    }

    console.log('✅ New password is different');

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.log('✅ Password changed successfully for user:', user.email);

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    console.error('   Error message:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

module.exports = {
  uploadProfilePhoto,
  updateProfile,
  deleteAccount,
  changeEmail,
  changePassword, // ✅ NEW: Export changePassword
};