const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Extract user agent and other info from request
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress;

    // Detect device type
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      device = 'Tablet';
    }

    // Detect browser
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

    // Detect OS
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

    // Get country from IP address using ip-api.com (free service)
    let country = 'Unknown';
    try {
      // Skip geolocation for localhost/private IPs
      if (ipAddress && 
          !ipAddress.includes('127.0.0.1') && 
          !ipAddress.includes('localhost') &&
          !ipAddress.includes('::1') &&
          !ipAddress.startsWith('192.168.') &&
          !ipAddress.startsWith('10.')) {
        
        const axios = require('axios');
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=country`, {
          timeout: 3000 // 3 second timeout
        });
        
        if (geoResponse.data && geoResponse.data.country) {
          country = geoResponse.data.country;
        }
      }
    } catch (geoError) {
      console.log('Geolocation lookup failed, using Unknown:', geoError.message);
      // Continue with 'Unknown' country
    }

    // Create analytics entry
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
    const userId = req.user.userId;

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

    // Calculate total views from analytics table
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

    // Get view counts for each item
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

    // Calculate views for each campaign
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
    const userId = req.user.userId;
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

    // Get total views
    const totalViews = await prisma.analytics.count({
      where: { itemId: id }
    });

    // Get views by date (last 30 days)
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

    // Format views by date
    const formattedViewsByDate = viewsByDate.map(view => ({
      date: view.createdAt.toISOString().split('T')[0],
      views: view._count
    }));

    // Get top locations
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