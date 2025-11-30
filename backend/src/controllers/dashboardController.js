const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user with storage info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageUsed: true,
        storageLimit: true,
      },
    });

    // Count items (uploads)
    const totalUploads = await prisma.item.count({
      where: { userId },
    });

    // Count items with QR codes
    const totalQRCodes = await prisma.item.count({
      where: {
        userId,
        qrCodeUrl: { not: null },
      },
    });

    // Count campaigns
    const totalCampaigns = await prisma.campaign.count({
      where: { userId },
    });

    // Count team members
    const totalTeamMembers = await prisma.teamMember.count({
      where: { userId },
    });

    // Get all user's items
    const userItems = await prisma.item.findMany({
      where: { userId },
      select: { id: true }
    });

    const itemIds = userItems.map(item => item.id);

    // Calculate total views from analytics table
    const totalViews = itemIds.length > 0 
      ? await prisma.analytics.count({
          where: { itemId: { in: itemIds } }
        })
      : 0;

    // Calculate storage percentage
    const storageUsed = Number(user.storageUsed);
    const storageLimit = Number(user.storageLimit);
    const storagePercentage = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

    res.json({
      status: 'success',
      stats: {
        totalUploads,
        totalViews,
        qrCodesGenerated: totalQRCodes,
        totalQRCodes,
        totalCampaigns,
        totalTeamMembers,
        storageUsed: storageUsed.toString(),
        storageLimit: storageLimit.toString(),
        storagePercentage,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get dashboard stats',
    });
  }
};

module.exports = {
  getDashboardStats,
};