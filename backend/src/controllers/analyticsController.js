const prisma = require('../lib/prisma');

const trackView = async (req, res) => {
  try {
    const { slug } = req.body;

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

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress;

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

    await prisma.analytics.create({
      data: {
        itemId: item.id,
        country: country,
        device: device,
        browser: browser,
        os: os,
      },
    });

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
      where: { userId },
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
      where: { userId },
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
    });

    const campaignStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignItemIds = campaign.items.map(item => item.id);
        const views = await prisma.analytics.count({
          where: {
            itemId: { in: campaignItemIds }
          }
        });
        
        return {
          id: campaign.id,
          name: campaign.name,
          itemCount: campaign._count.items,
          views: views,
        };
      })
    );

    res.json({
      status: 'success',
      analytics: {
        totalItems,
        totalViews,
        itemsByType,
        recentItems,
        campaignStats,
      },
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

    const totalViews = await prisma.analytics.count({
      where: { itemId: id }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all analytics records for this item in the last 30 days
    const analyticsRecords = await prisma.analytics.findMany({
      where: {
        itemId: id,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date (not timestamp)
    const viewsByDateMap = {};
    analyticsRecords.forEach(record => {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!viewsByDateMap[dateStr]) {
        viewsByDateMap[dateStr] = 0;
      }
      viewsByDateMap[dateStr]++;
    });

    // Convert to array format
    const formattedViewsByDate = Object.entries(viewsByDateMap).map(([date, views]) => ({
      date,
      views
    })).sort((a, b) => a.date.localeCompare(b.date));

    const topLocations = await prisma.analytics.groupBy({
      by: ['country'],
      where: { itemId: id },
      _count: true,
      orderBy: { _count: { country: 'desc' } },
      take: 5
    });

    const formattedLocations = topLocations.map(loc => ({
      country: loc.country || 'Unknown',
      views: loc._count
    }));

    res.json({
      status: 'success',
      analytics: {
        totalViews,
        viewsByDate: formattedViewsByDate,
        topLocations: formattedLocations,
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

    // Get all items for the user
    const items = await prisma.item.findMany({
      where: { userId },
      select: { id: true },
    });

    const itemIds = items.map(item => item.id);

    if (itemIds.length === 0) {
      return res.json({
        status: 'success',
        activity: [],
      });
    }

    // Get all analytics records for user's items
    const analyticsRecords = await prisma.analytics.findMany({
      where: {
        itemId: { in: itemIds }
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
    });

    // Process data by date
    const activityByDate = {};
    
    analyticsRecords.forEach(record => {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!activityByDate[dateStr]) {
        activityByDate[dateStr] = {
          date: dateStr,
          views: 0,
          createdAt: record.createdAt,
        };
      }
      activityByDate[dateStr].views += 1;
    });

    // Convert to array and sort by date
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

    // Get all items for the user
    const items = await prisma.item.findMany({
      where: { userId },
      select: { id: true },
    });

    const itemIds = items.map(item => item.id);

    if (itemIds.length === 0) {
      return res.json({
        status: 'success',
        activityByHour: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          hourLabel: `${String(i).padStart(2, '0')}:00`,
          views: 0
        }))
      });
    }

    // Get all analytics records for user's items
    const analyticsRecords = await prisma.analytics.findMany({
      where: {
        itemId: { in: itemIds }
      },
      select: {
        createdAt: true,
      },
    });

    // Count views by hour (0-23)
    const hourCounts = Array(24).fill(0);
    
    analyticsRecords.forEach(record => {
      const hour = record.createdAt.getHours();
      hourCounts[hour]++;
    });

    // Format response
    const activityByHour = hourCounts.map((count, hour) => ({
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      views: count
    }));

    res.json({
      status: 'success',
      activityByHour,
    });
  } catch (error) {
    console.error('Get time of day activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get time of day activity',
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