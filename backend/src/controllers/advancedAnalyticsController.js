const prisma = require('../lib/prisma');

const getAdvancedAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeRange = '7d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const userItems = await prisma.item.findMany({
      where: { userId },
      select: { id: true }
    });

    const itemIds = userItems.map(item => item.id);

    if (itemIds.length === 0) {
      return res.json({
        status: 'success',
        analytics: {
          totalViews: 0,
          uniqueVisitors: 0,
          avgSessionTime: '0m 0s',
          bounceRate: '0%',
          topCountries: [],
          devices: [],
          browsers: [],
          os: [],
          ageGroups: [],
          hourlyViews: []
        }
      });
    }

    const analytics = await prisma.analytics.findMany({
      where: {
        itemId: { in: itemIds },
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        country: true,
        device: true,
        browser: true,
        os: true,
        createdAt: true
      }
    });

    const totalViews = analytics.length;

    const uniqueVisitors = new Set(analytics.map(a => 
      `${a.country}-${a.device}-${a.browser}`
    )).size;

    const countryCount = {};
    analytics.forEach(a => {
      const country = a.country || 'Unknown';
      countryCount[country] = (countryCount[country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCount)
      .map(([country, views]) => ({
        country: country,
        code: getCountryCode(country),
        views: views,
        percentage: Math.round((views / totalViews) * 100)
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const deviceCount = { Mobile: 0, Desktop: 0, Tablet: 0 };
    analytics.forEach(a => {
      const device = a.device || 'Desktop';
      if (deviceCount.hasOwnProperty(device)) {
        deviceCount[device]++;
      }
    });

    const devices = Object.entries(deviceCount).map(([type, count]) => ({
      type,
      count,
      percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
    }));

    const browserCount = {};
    analytics.forEach(a => {
      const browser = a.browser || 'Other';
      browserCount[browser] = (browserCount[browser] || 0) + 1;
    });

    const browsers = Object.entries(browserCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const osCount = {};
    analytics.forEach(a => {
      const os = a.os || 'Other';
      osCount[os] = (osCount[os] || 0) + 1;
    });

    const osList = Object.entries(osCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const hourlyCount = Array(8).fill(0);
    analytics.forEach(a => {
      const hour = new Date(a.createdAt).getHours();
      const block = Math.floor(hour / 3);
      hourlyCount[block]++;
    });

    const hourlyViews = [
      { hour: '00:00', views: hourlyCount[0] },
      { hour: '03:00', views: hourlyCount[1] },
      { hour: '06:00', views: hourlyCount[2] },
      { hour: '09:00', views: hourlyCount[3] },
      { hour: '12:00', views: hourlyCount[4] },
      { hour: '15:00', views: hourlyCount[5] },
      { hour: '18:00', views: hourlyCount[6] },
      { hour: '21:00', views: hourlyCount[7] }
    ];

    const sessionTimes = [];
    const visitorSessions = {};
    
    analytics.forEach(a => {
      const visitorKey = `${a.country}-${a.device}-${a.browser}`;
      if (!visitorSessions[visitorKey]) {
        visitorSessions[visitorKey] = [];
      }
      visitorSessions[visitorKey].push(new Date(a.createdAt));
    });

    Object.values(visitorSessions).forEach(sessions => {
      if (sessions.length > 1) {
        sessions.sort((a, b) => a - b);
        for (let i = 1; i < sessions.length; i++) {
          const duration = (sessions[i] - sessions[i-1]) / 1000;
          if (duration < 1800) {
            sessionTimes.push(duration);
          }
        }
      }
    });

    let avgSessionTime = '0m 0s';
    if (sessionTimes.length > 0) {
      const avgSeconds = sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length;
      const minutes = Math.floor(avgSeconds / 60);
      const seconds = Math.floor(avgSeconds % 60);
      avgSessionTime = `${minutes}m ${seconds}s`;
    }

    const singlePageSessions = Object.values(visitorSessions).filter(s => s.length === 1).length;
    const totalSessions = Object.keys(visitorSessions).length;
    const bounceRate = totalSessions > 0 ? `${Math.round((singlePageSessions / totalSessions) * 100)}%` : '0%';

    res.json({
      status: 'success',
      analytics: {
        totalViews,
        uniqueVisitors,
        avgSessionTime,
        bounceRate,
        topCountries,
        devices,
        browsers,
        os: osList,
        ageGroups: [],
        hourlyViews
      }
    });

  } catch (error) {
    console.error('Advanced analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch advanced analytics'
    });
  }
};

function getCountryCode(countryName) {
  const countryCodes = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Germany': 'DE',
    'Australia': 'AU',
    'France': 'FR',
    'India': 'IN',
    'Japan': 'JP',
    'China': 'CN',
    'Brazil': 'BR',
    'Pakistan': 'PK'
  };
  
  return countryCodes[countryName] || 'XX';
}

module.exports = {
  getAdvancedAnalytics
};