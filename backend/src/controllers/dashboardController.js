const prisma = require('../lib/prisma');

// ✅ OPTIMIZED: Uses SQL aggregation instead of loading all items into memory
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    // ✅ Run all queries in parallel for speed
    const [
      user,
      totalUploads,
      totalQRCodes,
      totalCampaigns,
      totalTeamMembers,
      totalViews
    ] = await Promise.all([
      // Get user storage info
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          storageUsed: true,
          storageLimit: true,
        },
      }),
      
      // ✅ OPTIMIZED: Direct count instead of fetching all items
      prisma.item.count({
        where: { userId },
      }),
      
      // Count campaigns with QR codes
      prisma.campaign.count({
        where: {
          userId,
          qrCodeUrl: { not: null },
        },
      }),
      
      // Count campaigns
      prisma.campaign.count({
        where: { userId },
      }),
      
      // Count team members
      prisma.teamMember.count({
        where: { userId },
      }),
      
      // ✅ OPTIMIZED: Use SQL to count analytics directly
      // This is MUCH faster than loading all items into memory
      prisma.$queryRaw`
        SELECT COUNT(*)::int as total
        FROM "Analytics" a
        INNER JOIN "Item" i ON a."itemId" = i.id
        WHERE i."userId" = ${userId}
      `
    ]);

    // Extract total views from SQL result
    const viewsCount = totalViews[0]?.total || 0;

    // Calculate storage percentage
    const storageUsed = Number(user.storageUsed);
    const storageLimit = Number(user.storageLimit);
    const storagePercentage = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

    res.json({
      status: 'success',
      stats: {
        totalUploads,
        totalViews: viewsCount,
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