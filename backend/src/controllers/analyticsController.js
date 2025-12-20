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

    const viewsByDate = await prisma.analytics.groupBy({
      by: ['createdAt'],
      where: {
        itemId: id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
    });

    const formattedViewsByDate = viewsByDate.map(view => ({
      date: view.createdAt.toISOString().split('T')[0],
      views: view._count
    }));

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

module.exports = {
  trackView,
  getAnalytics,
  getItemAnalytics,
};