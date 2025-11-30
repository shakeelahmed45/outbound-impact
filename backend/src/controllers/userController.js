const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

module.exports = {
  uploadProfilePhoto,
  updateProfile,
  deleteAccount,
};