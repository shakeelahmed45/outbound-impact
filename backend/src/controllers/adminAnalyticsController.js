const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    
    // ✅ REAL Revenue Analytics from Stripe
    const revenue = await getRealRevenueFromStripe();
    
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

// ═══════════════════════════════════════════════════════════
// ✅ REAL REVENUE FROM STRIPE API
// ═══════════════════════════════════════════════════════════
async function getRealRevenueFromStripe() {
  try {
    console.log('💰 Fetching REAL revenue from Stripe...');

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ✅ Calculate REAL MRR from active Stripe subscriptions
    let mrr = 0;
    let activeSubCount = 0;
    
    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.plan']
    });

    console.log(`📊 Found ${subscriptions.data.length} active subscriptions in Stripe`);

    // Calculate MRR from actual subscription prices
    subscriptions.data.forEach(sub => {
      if (sub.items && sub.items.data.length > 0) {
        const price = sub.items.data[0].price;
        if (price && price.recurring && price.recurring.interval === 'month') {
          const monthlyAmount = price.unit_amount / 100; // Convert cents to dollars
          mrr += monthlyAmount;
          activeSubCount++;
        }
      }
    });

    console.log(`✅ Calculated MRR: $${mrr.toFixed(2)} from ${activeSubCount} subscriptions`);

    // ✅ Get REAL payments for this month from Stripe invoices
    const thisMonthPayments = await stripe.invoices.list({
      created: {
        gte: Math.floor(thisMonthStart.getTime() / 1000)
      },
      status: 'paid',
      limit: 100
    });

    let thisMonthRevenue = 0;
    thisMonthPayments.data.forEach(invoice => {
      thisMonthRevenue += invoice.amount_paid / 100; // Convert cents to dollars
    });

    console.log(`✅ This month revenue: $${thisMonthRevenue.toFixed(2)} from ${thisMonthPayments.data.length} payments`);

    // ✅ Get REAL payments for last month from Stripe invoices
    const lastMonthPayments = await stripe.invoices.list({
      created: {
        gte: Math.floor(lastMonthStart.getTime() / 1000),
        lte: Math.floor(lastMonthEnd.getTime() / 1000)
      },
      status: 'paid',
      limit: 100
    });

    let lastMonthRevenue = 0;
    lastMonthPayments.data.forEach(invoice => {
      lastMonthRevenue += invoice.amount_paid / 100; // Convert cents to dollars
    });

    console.log(`✅ Last month revenue: $${lastMonthRevenue.toFixed(2)} from ${lastMonthPayments.data.length} payments`);

    return {
      mrr: parseFloat(mrr.toFixed(2)),
      thisMonth: parseFloat(thisMonthRevenue.toFixed(2)),
      lastMonth: parseFloat(lastMonthRevenue.toFixed(2)),
      activeSubscriptions: activeSubCount,
      thisMonthPayments: thisMonthPayments.data.length,
      lastMonthPayments: lastMonthPayments.data.length
    };

  } catch (error) {
    console.error('❌ Error fetching real revenue from Stripe:', error);
    
    // Fallback to basic calculation if Stripe API fails
    return {
      mrr: 0,
      thisMonth: 0,
      lastMonth: 0,
      activeSubscriptions: 0,
      thisMonthPayments: 0,
      lastMonthPayments: 0,
      error: 'Failed to fetch from Stripe'
    };
  }
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