const prisma = require('../lib/prisma');
const { buildOrgFilter } = require("../helpers/orgScope");
const { notifyViewMilestone } = require('../services/notificationService');

const trackView = async (req, res) => {
  try {
    const { slug, source } = req.body;

    if (!slug) {
      return res.status(400).json({
        status: 'error',
        message: 'Slug is required',
      });
    }

    const item = await prisma.item.findUnique({
      where: { slug },
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found',
      });
    }

    // Determine view source from param
    const viewSource = (source || 'direct').toLowerCase();

    const userAgent = req.headers['user-agent'] || '';

    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      device = 'Tablet';
    }

    let browser = 'Other';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    }

    let os = 'Other';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    let country = 'Unknown';
    try {
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress;

      if (ipAddress && 
          !ipAddress.includes('127.0.0.1') && 
          !ipAddress.includes('localhost') &&
          !ipAddress.includes('::1') &&
          !ipAddress.startsWith('192.168.') &&
          !ipAddress.startsWith('10.')) {
        
        const axios = require('axios');
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=country`, {
          timeout: 3000
        });
        
        if (geoResponse.data && geoResponse.data.country) {
          country = geoResponse.data.country;
        }
      }
    } catch (geoError) {
      console.log('Geolocation lookup failed, using Unknown:', geoError.message);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STEP 1: Create Analytics record (for dashboard counts)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    await prisma.analytics.create({
      data: {
        itemId: item.id,
        source: viewSource,
        country: country,
        device: device,
        browser: browser,
        os: os,
      },
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STEP 2: Increment view counters on the Item
    // Use try/catch so if viewsQr columns don't exist,
    // we still fall back to just incrementing total views
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    try {
      const incrementData = { views: { increment: 1 } };
      if (viewSource === 'qr') {
        incrementData.viewsQr = { increment: 1 };
      } else if (viewSource === 'nfc') {
        incrementData.viewsNfc = { increment: 1 };
      } else {
        incrementData.viewsDirect = { increment: 1 };
      }

      await prisma.item.update({
        where: { id: item.id },
        data: incrementData,
      });

      // ðŸ”” Notify: view milestone check
      const updatedItem = await prisma.item.findUnique({
        where: { id: item.id },
        select: { views: true, title: true, userId: true },
      });
      if (updatedItem) {
        await notifyViewMilestone(updatedItem.userId, updatedItem.title, updatedItem.views);
      }
    } catch (updateError) {
      // Fallback: if source columns don't exist, just increment total views
      console.log('Source column update failed, falling back to views only:', updateError.message);
      try {
        await prisma.item.update({
          where: { id: item.id },
          data: { views: { increment: 1 } },
        });
      } catch (fallbackError) {
        console.error('Even basic views increment failed:', fallbackError.message);
      }
    }

    res.json({
      status: 'success',
      message: 'View tracked',
    });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track view',
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const items = await prisma.item.findMany({
      where: { userId, ...buildOrgFilter(req) },
      select: {
        id: true,
        title: true,
        type: true,
        slug: true,
        createdAt: true,
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalItems = items.length;

    const itemIds = items.map(item => item.id);
    const totalViews = await prisma.analytics.count({
      where: {
        itemId: { in: itemIds }
      }
    });

    const itemsByType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    const itemViewCounts = await Promise.all(
      items.map(async (item) => {
        const views = await prisma.analytics.count({
          where: { itemId: item.id }
        });
        return { itemId: item.id, views };
      })
    );

    const viewCountMap = Object.fromEntries(
      itemViewCounts.map(({ itemId, views }) => [itemId, views])
    );

    const recentItems = items
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(item => ({
        ...item,
        views: viewCountMap[item.id] || 0,
      }));

    const campaigns = await prisma.campaign.findMany({
      where: { userId, ...buildOrgFilter(req) },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    const campaignSummary = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
    }));

    // Source breakdown from Analytics table
    let sourceBreakdown = { qr: 0, nfc: 0, direct: 0 };
    try {
      const sourceCounts = await prisma.analytics.groupBy({
        by: ['source'],
        where: { itemId: { in: itemIds } },
        _count: { source: true },
      });
      sourceCounts.forEach(sc => {
        if (sc.source === 'qr') sourceBreakdown.qr = sc._count.source;
        else if (sc.source === 'nfc') sourceBreakdown.nfc = sc._count.source;
        else sourceBreakdown.direct += sc._count.source;
      });
    } catch (e) {
      console.log('Source breakdown query failed:', e.message);
    }

    res.json({
      status: 'success',
      totalItems,
      totalViews,
      itemsByType,
      recentItems,
      campaigns: campaignSummary,
      sourceBreakdown,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get analytics',
    });
  }
};

const getItemAnalytics = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found',
      });
    }

    const analytics = await prisma.analytics.findMany({
      where: { itemId: id },
      orderBy: { createdAt: 'desc' },
    });

    const totalViews = analytics.length;

    const byCountry = {};
    const byDevice = {};
    const byBrowser = {};
    const bySource = {};

    analytics.forEach(record => {
      byCountry[record.country || 'Unknown'] = (byCountry[record.country || 'Unknown'] || 0) + 1;
      byDevice[record.device || 'Unknown'] = (byDevice[record.device || 'Unknown'] || 0) + 1;
      byBrowser[record.browser || 'Unknown'] = (byBrowser[record.browser || 'Unknown'] || 0) + 1;
      bySource[record.source || 'direct'] = (bySource[record.source || 'direct'] || 0) + 1;
    });

    res.json({
      status: 'success',
      item: {
        id: item.id,
        title: item.title,
        type: item.type,
      },
      analytics: {
        totalViews,
        byCountry,
        byDevice,
        byBrowser,
        bySource,
      },
    });
  } catch (error) {
    console.error('Get item analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get item analytics',
    });
  }
};

const getActivityData = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const items = await prisma.item.findMany({
      where: { userId, ...buildOrgFilter(req) },
      select: { id: true },
    });

    const itemIds = items.map(item => item.id);

    if (itemIds.length === 0) {
      return res.json({
        status: 'success',
        activity: [],
      });
    }

    const analyticsRecords = await prisma.analytics.findMany({
      where: {
        itemId: { in: itemIds }
      },
      select: {
        createdAt: true,
        source: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
    });

    const activityByDate = {};
    
    analyticsRecords.forEach(record => {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!activityByDate[dateStr]) {
        activityByDate[dateStr] = {
          date: dateStr,
          views: 0,
          qrScans: 0,
          nfcTaps: 0,
          directViews: 0,
          createdAt: record.createdAt,
        };
      }
      activityByDate[dateStr].views += 1;
      if (record.source === 'qr') activityByDate[dateStr].qrScans += 1;
      else if (record.source === 'nfc') activityByDate[dateStr].nfcTaps += 1;
      else activityByDate[dateStr].directViews += 1;
    });

    const activity = Object.values(activityByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      status: 'success',
      activity,
    });
  } catch (error) {
    console.error('Get activity data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity data',
    });
  }
};

const getTimeOfDayActivity = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const items = await prisma.item.findMany({
      where: { userId, ...buildOrgFilter(req) },
      select: { id: true },
    });

    const itemIds = items.map(item => item.id);

    if (itemIds.length === 0) {
      return res.json({ status: 'success', hourly: [] });
    }

    const records = await prisma.analytics.findMany({
      where: { itemId: { in: itemIds } },
      select: { createdAt: true },
    });

    const hourCounts = new Array(24).fill(0);
    records.forEach(r => {
      const hour = new Date(r.createdAt).getHours();
      hourCounts[hour]++;
    });

    const hourly = hourCounts.map((count, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      views: count,
    }));

    res.json({ status: 'success', hourly });
  } catch (error) {
    console.error('Get time of day error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get time of day data',
    });
  }
};

module.exports = {
  trackView,
  getAnalytics,
  getItemAnalytics,
  getActivityData,
  getTimeOfDayActivity,
};