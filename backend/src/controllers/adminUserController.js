const prisma = require('../lib/prisma');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ═══════════════════════════════════════════════════════════
// GET ALL USERS (Enhanced with filters)
// ═══════════════════════════════════════════════════════════
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '',
      status = '',
      subscriptionStatus = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause with all filters
    const where = {};

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Subscription status filter
    if (subscriptionStatus) {
      where.subscriptionStatus = subscriptionStatus;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          storageUsed: true,
          storageLimit: true,
          subscriptionStatus: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              items: true,
              campaigns: true
            }
          },
          memberOf: {
            select: {
              id: true,
              role: true,
              status: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);

    const usersWithStringStorage = users.map(user => ({
      ...user,
      storageUsed: user.storageUsed.toString(),
      storageLimit: user.storageLimit.toString()
    }));

    res.json({
      status: 'success',
      users: usersWithStringStorage,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// BULK ACTIONS
// ═══════════════════════════════════════════════════════════
const bulkUserActions = async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !userIds || userIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Action and user IDs are required'
      });
    }

    let result;
    let message;

    switch (action) {
      case 'suspend':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'suspended' }
        });
        message = `${result.count} user(s) suspended successfully`;
        break;

      case 'unsuspend':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'active' }
        });
        message = `${result.count} user(s) unsuspended successfully`;
        break;

      case 'delete':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'deleted' }
        });
        message = `${result.count} user(s) marked as deleted`;
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid action'
        });
    }

    res.json({
      status: 'success',
      message,
      count: result.count
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk action'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// SUSPEND/UNSUSPEND USER
// ═══════════════════════════════════════════════════════════
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspend } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        status: suspend ? 'suspended' : 'active'
      }
    });

    res.json({
      status: 'success',
      message: `User ${suspend ? 'suspended' : 'unsuspended'} successfully`,
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to suspend user'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// USER IMPERSONATION
// ═══════════════════════════════════════════════════════════
const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate impersonation token (expires in 1 hour)
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        impersonatedBy: req.user.id,
        type: 'impersonation'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Impersonate user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to impersonate user'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORT USERS TO CSV
// ═══════════════════════════════════════════════════════════
const exportUsers = async (req, res) => {
  try {
    const { 
      search = '', 
      role = '',
      status = '',
      subscriptionStatus = ''
    } = req.query;

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (subscriptionStatus) where.subscriptionStatus = subscriptionStatus;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        subscriptionStatus: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            items: true,
            campaigns: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert to CSV
    const headers = [
      'ID', 'Name', 'Email', 'Role', 'Status', 'Subscription', 
      'Storage Used (GB)', 'Storage Limit (GB)', 'Items', 'Campaigns',
      'Created At', 'Last Login'
    ];

    const rows = users.map(user => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.status || 'active',
      user.subscriptionStatus || 'none',
      (Number(user.storageUsed) / (1024 * 1024 * 1024)).toFixed(2),
      (Number(user.storageLimit) / (1024 * 1024 * 1024)).toFixed(2),
      user._count.items,
      user._count.campaigns,
      new Date(user.createdAt).toISOString(),
      user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : 'Never'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_export_${new Date().toISOString()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export users'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET USER DETAILS (with activity logs)
// ═══════════════════════════════════════════════════════════
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        items: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            views: true,
            createdAt: true
          }
        },
        campaigns: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: { items: true }
            }
          }
        },
        teamMembers: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            memberUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        memberOf: {
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true,
            campaigns: true,
            teamMembers: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get activity logs
    const activities = await getUserActivityLogs(userId);

    res.json({
      status: 'success',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString()
      },
      activities
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user details'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET USER ACTIVITY LOGS
// ═══════════════════════════════════════════════════════════
async function getUserActivityLogs(userId) {
  const activities = [];

  // Recent items created
  const recentItems = await prisma.item.findMany({
    where: { userId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true
    }
  });

  recentItems.forEach(item => {
    activities.push({
      type: 'item_created',
      description: `Created ${item.type.toLowerCase()} "${item.title}"`,
      timestamp: item.createdAt,
      itemId: item.id
    });
  });

  // Recent campaigns
  const recentCampaigns = await prisma.campaign.findMany({
    where: { userId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true
    }
  });

  recentCampaigns.forEach(campaign => {
    activities.push({
      type: 'campaign_created',
      description: `Created campaign "${campaign.name}"`,
      timestamp: campaign.createdAt,
      campaignId: campaign.id
    });
  });

  // Recent team member additions
  const teamAdditions = await prisma.teamMember.findMany({
    where: { 
      OR: [
        { userId },
        { memberUserId: userId }
      ]
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  teamAdditions.forEach(member => {
    activities.push({
      type: 'team_member_added',
      description: `Added team member ${member.email}`,
      timestamp: member.createdAt
    });
  });

  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return activities.slice(0, 20);
}

// ═══════════════════════════════════════════════════════════
// UPDATE USER (existing function - enhanced)
// ═══════════════════════════════════════════════════════════
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.stripeCustomerId;
    delete updateData.subscriptionId;

    // Convert storage limit if provided
    if (updateData.storageLimit) {
      updateData.storageLimit = BigInt(updateData.storageLimit);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      status: 'success',
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE USER (existing function)
// ═══════════════════════════════════════════════════════════
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Soft delete - just mark as deleted
    await prisma.user.update({
      where: { id: userId },
      data: { 
        status: 'deleted',
        deletedAt: new Date()
      }
    });

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// REMOVE USER FROM TEAM (existing function)
// ═══════════════════════════════════════════════════════════
const removeUserFromTeam = async (req, res) => {
  try {
    const { teamMemberId } = req.params;

    await prisma.teamMember.delete({
      where: { id: teamMemberId }
    });

    res.json({
      status: 'success',
      message: 'User removed from team successfully'
    });

  } catch (error) {
    console.error('Remove from team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove user from team'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// PASSWORD RESET (existing function)
// ═══════════════════════════════════════════════════════════
const sendPasswordReset = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    res.json({
      status: 'success',
      resetLink
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate reset link'
    });
  }
};

module.exports = {
  getAllUsers,
  bulkUserActions,
  suspendUser,
  impersonateUser,
  exportUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  removeUserFromTeam,
  sendPasswordReset
};