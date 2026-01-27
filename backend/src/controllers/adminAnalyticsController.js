const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// ENHANCED ADMIN STATS (with previous period comparison)
// ═══════════════════════════════════════════════════════════
const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period (last 30 days)
    const [
      totalUsers,
      totalItems,
      totalCampaigns,
      activeSubscriptions,
      totalStorageUsed,
      totalViews,
      chatStats
    ] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.campaign.count(),
      prisma.user.count({
        where: {
          subscriptionStatus: 'active'
        }
      }),
      prisma.user.aggregate({
        _sum: {
          storageUsed: true
        }
      }),
      prisma.item.aggregate({
        _sum: {
          views: true
        }
      }),
      getChatStats()
    ]);

    // Previous period (30-60 days ago)
    const [
      previousUsers,
      previousItems,
      previousCampaigns,
      previousSubscriptions
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
      prisma.item.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
      prisma.campaign.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      }),
      prisma.user.count({
        where: {
          subscriptionStatus: 'active',
          currentPeriodStart: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      })
    ]);

    // Users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {});

    res.json({
      status: 'success',
      stats: {
        totalUsers,
        totalItems,
        totalCampaigns,
        activeSubscriptions,
        totalStorageUsed: totalStorageUsed._sum.storageUsed?.toString() || '0',
        totalViews: totalViews._sum.views || 0,
        usersByRole: roleStats,
        chatStats,
        previousPeriod: {
          totalUsers: previousUsers,
          totalItems: previousItems,
          totalCampaigns: previousCampaigns,
          activeSubscriptions: previousSubscriptions
        }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin stats'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ANALYTICS ENDPOINT (with time range support)
// ═══════════════════════════════════════════════════════════
const getAnalytics = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const days = parseInt(range);
    
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // User Growth Data
    const userGrowth = await getUserGrowthData(startDate, days);
    
    // Revenue Analytics
    const revenue = await getRevenueAnalytics();
    
    // Storage Analytics
    const storage = await getStorageAnalytics();
    
    // Subscription Distribution
    const subscriptionDistribution = await getSubscriptionDistribution();
    
    // Chat Statistics
    const chatStats = await getChatAnalytics();

    res.json({
      status: 'success',
      analytics: {
        userGrowth,
        revenue,
        storage,
        subscriptionDistribution,
        chatStats
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// RECENT ACTIVITIES
// ═══════════════════════════════════════════════════════════
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const activities = [];

    // Recent user registrations
    const recentUsers = await prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registered',
        description: `${user.name} (${user.email}) registered`,
        timestamp: user.createdAt,
        userId: user.id
      });
    });

    // Recent items created
    const recentItems = await prisma.item.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    recentItems.forEach(item => {
      activities.push({
        type: 'item_created',
        description: `${item.user.name} created ${item.type.toLowerCase()} "${item.title}"`,
        timestamp: item.createdAt,
        itemId: item.id
      });
    });

    // Recent campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    recentCampaigns.forEach(campaign => {
      activities.push({
        type: 'campaign_created',
        description: `${campaign.user.name} created campaign "${campaign.name}"`,
        timestamp: campaign.createdAt,
        campaignId: campaign.id
      });
    });

    // Recent chat conversations
    const recentChats = await prisma.chatConversation.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    recentChats.forEach(chat => {
      activities.push({
        type: 'chat_started',
        description: `${chat.user.name} started a chat conversation`,
        timestamp: chat.createdAt,
        chatId: chat.id
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      status: 'success',
      activities: activities.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent activities'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function getUserGrowthData(startDate, days) {
  const userGrowth = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    
    const count = await prisma.user.count({
      where: {
        createdAt: {
          gte: date,
          lt: nextDate
        }
      }
    });

    userGrowth.push({
      date: date.toISOString().split('T')[0],
      users: count
    });
  }

  return userGrowth;
}

async function getRevenueAnalytics() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Subscription pricing
  const pricing = {
    'INDIVIDUAL': 85,
    'ORG_SMALL': 279,
    'ORG_MEDIUM': 549,
    'ORG_ENTERPRISE': 1299
  };

  // Active subscriptions by role
  const activeByRole = await prisma.user.groupBy({
    by: ['role'],
    where: {
      subscriptionStatus: 'active'
    },
    _count: {
      role: true
    }
  });

  let mrr = 0;
  activeByRole.forEach(item => {
    const price = pricing[item.role] || 0;
    mrr += price * item._count.role;
  });

  // This month's new subscriptions
  const thisMonthSubs = await prisma.user.count({
    where: {
      subscriptionStatus: 'active',
      currentPeriodStart: {
        gte: thisMonthStart
      }
    }
  });

  const thisMonthRevenue = thisMonthSubs * 85; // Average

  // Last month's subscriptions
  const lastMonthSubs = await prisma.user.count({
    where: {
      subscriptionStatus: 'active',
      currentPeriodStart: {
        gte: lastMonthStart,
        lt: lastMonthEnd
      }
    }
  });

  const lastMonthRevenue = lastMonthSubs * 85; // Average

  return {
    mrr,
    thisMonth: thisMonthRevenue,
    lastMonth: lastMonthRevenue
  };
}

async function getStorageAnalytics() {
  const totalStorageAllocated = await prisma.user.aggregate({
    _sum: {
      storageLimit: true
    }
  });

  const totalStorageUsed = await prisma.user.aggregate({
    _sum: {
      storageUsed: true
    }
  });

  const allocated = Number(totalStorageAllocated._sum.storageLimit || 0);
  const used = Number(totalStorageUsed._sum.storageUsed || 0);
  
  const utilizationPercent = allocated > 0 ? ((used / allocated) * 100).toFixed(1) : 0;

  return {
    totalAllocated: allocated.toString(),
    totalUsed: used.toString(),
    utilizationPercent: parseFloat(utilizationPercent)
  };
}

async function getSubscriptionDistribution() {
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: {
      subscriptionStatus: 'active'
    },
    _count: {
      role: true
    }
  });

  return usersByRole.map(item => ({
    name: item.role === 'INDIVIDUAL' ? 'Individual' :
          item.role === 'ORG_SMALL' ? 'Small Org' :
          item.role === 'ORG_MEDIUM' ? 'Medium Org' :
          item.role === 'ORG_ENTERPRISE' ? 'Enterprise' : item.role,
    value: item._count.role
  }));
}

async function getChatStats() {
  const [active, closed, total] = await Promise.all([
    prisma.chatConversation.count({
      where: { status: 'ACTIVE' }
    }),
    prisma.chatConversation.count({
      where: { status: 'CLOSED' }
    }),
    prisma.chatConversation.count()
  ]);

  return {
    active,
    closed,
    total
  };
}

async function getChatAnalytics() {
  // Average response time (mock for now)
  const avgResponseTime = '2.5m';
  
  // Get feedback ratings
  const conversations = await prisma.chatConversation.findMany({
    where: {
      feedbackRating: {
        not: null
      }
    },
    select: {
      feedbackRating: true
    }
  });

  let satisfactionRate = '0%';
  if (conversations.length > 0) {
    const avgRating = conversations.reduce((sum, c) => sum + (c.feedbackRating || 0), 0) / conversations.length;
    const satisfactionPercent = (avgRating / 5 * 100).toFixed(0);
    satisfactionRate = `${satisfactionPercent}%`;
  }

  return {
    avgResponseTime,
    satisfactionRate
  };
}

module.exports = {
  getAdminStats,
  getAnalytics,
  getRecentActivities
};