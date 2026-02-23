const prisma = require('../lib/prisma');
const { buildOrgFilter } = require('../helpers/orgScope');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const orgFilter = buildOrgFilter(req);

    // Date ranges for weekly comparison
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // ✅ ORG SCOPED: Get user's item IDs for analytics queries
    const userItems = await prisma.item.findMany({
      where: { userId, ...orgFilter },
      select: { id: true },
    });
    const itemIds = userItems.map(i => i.id);

    // Run all queries in parallel — all org-scoped
    const [
      user,
      totalUploads,
      totalQRCodes,
      totalCampaigns,
      totalTeamMembers,
      totalViewsAgg,
      totalQrScansAgg,
      totalLinkClicksResult,
      thisWeekAnalytics,
      lastWeekAnalytics,
      thisWeekUploads,
      lastWeekUploads,
    ] = await Promise.all([
      // User storage info (not org-scoped — global)
      prisma.user.findUnique({
        where: { id: userId },
        select: { storageUsed: true, storageLimit: true },
      }),

      // ✅ ORG SCOPED: Total uploads
      prisma.item.count({ where: { userId, ...orgFilter } }),

      // ✅ ORG SCOPED: QR codes generated
      prisma.campaign.count({
        where: { userId, qrCodeUrl: { not: null }, ...orgFilter },
      }),

      // ✅ ORG SCOPED: Total campaigns
      prisma.campaign.count({ where: { userId, ...orgFilter } }),

      // Team members (not org-scoped — shows total)
      prisma.teamMember.count({ where: { userId } }),

      // ✅ ORG SCOPED: Total views (Prisma aggregate — replaces raw SQL)
      prisma.item.aggregate({
        where: { userId, ...orgFilter },
        _sum: { views: true },
      }),

      // ✅ ORG SCOPED: Total QR scans (Prisma aggregate — replaces raw SQL)
      prisma.campaign.aggregate({
        where: { userId, ...orgFilter },
        _sum: { viewsQr: true },
      }),

      // ✅ ORG SCOPED: Total link/direct clicks
      itemIds.length > 0
        ? prisma.analytics.count({
            where: { itemId: { in: itemIds }, source: 'direct' },
          })
        : 0,

      // ✅ ORG SCOPED: This week analytics
      itemIds.length > 0
        ? prisma.analytics.findMany({
            where: {
              itemId: { in: itemIds },
              createdAt: { gte: thisWeekStart },
            },
            select: { source: true },
          })
        : [],

      // ✅ ORG SCOPED: Last week analytics
      itemIds.length > 0
        ? prisma.analytics.findMany({
            where: {
              itemId: { in: itemIds },
              createdAt: { gte: lastWeekStart, lt: thisWeekStart },
            },
            select: { source: true },
          })
        : [],

      // ✅ ORG SCOPED: This week uploads
      prisma.item.count({
        where: { userId, createdAt: { gte: thisWeekStart }, ...orgFilter },
      }),

      // ✅ ORG SCOPED: Last week uploads
      prisma.item.count({
        where: { userId, createdAt: { gte: lastWeekStart, lt: thisWeekStart }, ...orgFilter },
      }),
    ]);

    // Calculate weekly totals by source
    const thisWeek = { total: 0, qr: 0, direct: 0 };
    const lastWeek = { total: 0, qr: 0, direct: 0 };

    (Array.isArray(thisWeekAnalytics) ? thisWeekAnalytics : []).forEach(a => {
      thisWeek.total++;
      if (a.source === 'qr') thisWeek.qr++;
      else thisWeek.direct++;
    });

    (Array.isArray(lastWeekAnalytics) ? lastWeekAnalytics : []).forEach(a => {
      lastWeek.total++;
      if (a.source === 'qr') lastWeek.qr++;
      else lastWeek.direct++;
    });

    // Calculate percentage changes
    const calcChange = (current, previous) => {
      if (previous === 0 && current === 0) return null;
      if (previous === 0) return '+100%';
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct === 0) return null;
      return pct > 0 ? `+${pct}%` : `${pct}%`;
    };

    // ✅ Using Prisma aggregate instead of raw SQL
    const viewsCount = totalViewsAgg._sum?.views || 0;
    const qrScansCount = totalQrScansAgg._sum?.viewsQr || 0;
    const linkClicksCount = typeof totalLinkClicksResult === 'number' ? totalLinkClicksResult : 0;

    const storageUsed = Number(user?.storageUsed || 0);
    const storageLimit = Number(user?.storageLimit || 2147483648);
    const storagePercentage = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

    res.json({
      status: 'success',
      // ✅ NEW: Include org scope info for frontend
      orgScope: req.orgScope || null,
      orgNames: req.orgNames || null,
      stats: {
        totalUploads,
        totalViews: viewsCount,
        totalQrScans: qrScansCount,
        totalLinkClicks: linkClicksCount,
        qrCodesGenerated: totalQRCodes,
        totalQRCodes,
        totalCampaigns,
        totalTeamMembers,
        storageUsed: storageUsed.toString(),
        storageLimit: storageLimit.toString(),
        storagePercentage,
        changes: {
          uploads: calcChange(thisWeekUploads, lastWeekUploads),
          views: calcChange(thisWeek.total, lastWeek.total),
          qrScans: calcChange(thisWeek.qr, lastWeek.qr),
          linkClicks: calcChange(thisWeek.direct, lastWeek.direct),
        },
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

// Views Over Time — ✅ ORG SCOPED
const getViewsOverTime = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const orgFilter = buildOrgFilter(req);
    const { days = 14, period = 'daily' } = req.query;
    const numDays = Math.min(parseInt(days) || 14, 90);

    const items = await prisma.item.findMany({
      where: { userId, ...orgFilter },
      select: { id: true },
    });
    const itemIds = items.map(i => i.id);

    if (itemIds.length === 0) {
      return res.json({ status: 'success', viewsOverTime: [] });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setHours(0, 0, 0, 0);

    const analytics = await prisma.analytics.findMany({
      where: {
        itemId: { in: itemIds },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, source: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = {};
    for (let d = 0; d < numDays; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (numDays - 1 - d));
      const key = date.toISOString().split('T')[0];
      dailyMap[key] = { date: key, views: 0, qr: 0, nfc: 0, direct: 0 };
    }

    analytics.forEach(record => {
      const key = record.createdAt.toISOString().split('T')[0];
      if (!dailyMap[key]) {
        dailyMap[key] = { date: key, views: 0, qr: 0, nfc: 0, direct: 0 };
      }
      dailyMap[key].views += 1;
      if (record.source === 'qr') dailyMap[key].qr += 1;
      else if (record.source === 'nfc') dailyMap[key].nfc += 1;
      else dailyMap[key].direct += 1;
    });

    let result = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    if (period === 'weekly') {
      const weeklyMap = {};
      result.forEach(day => {
        const d = new Date(day.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { date: weekKey, views: 0, qr: 0, nfc: 0, direct: 0 };
        }
        weeklyMap[weekKey].views += day.views;
        weeklyMap[weekKey].qr += day.qr;
        weeklyMap[weekKey].nfc += day.nfc;
        weeklyMap[weekKey].direct += day.direct;
      });
      result = Object.values(weeklyMap).sort((a, b) => a.date.localeCompare(b.date));
    }

    res.json({ status: 'success', viewsOverTime: result });
  } catch (error) {
    console.error('Get views over time error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get views over time' });
  }
};

// Recent Activity — ✅ ORG SCOPED
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const orgFilter = buildOrgFilter(req);
    const { limit = 8 } = req.query;

    const items = await prisma.item.findMany({
      where: { userId, ...orgFilter },
      select: {
        id: true,
        title: true,
        type: true,
        slug: true,
        views: true,
        thumbnailUrl: true,
        createdAt: true,
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 8,
    });

    const recentActivity = await Promise.all(
      items.map(async (item) => {
        const lastView = await prisma.analytics.findFirst({
          where: { itemId: item.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        return {
          id: item.id,
          title: item.title || 'Untitled',
          type: item.type || 'Unknown',
          slug: item.slug,
          views: item.views || 0,
          thumbnailUrl: item.thumbnailUrl || null,
          stream: item.campaign?.name || null,
          uploadedAt: item.createdAt,
          lastViewedAt: lastView?.createdAt || null,
        };
      })
    );

    res.json({ status: 'success', recentActivity });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get recent activity' });
  }
};

module.exports = {
  getDashboardStats,
  getViewsOverTime,
  getRecentActivity,
};