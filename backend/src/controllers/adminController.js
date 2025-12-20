const prisma = require('../lib/prisma');
const crypto = require('crypto');

// Get admin dashboard stats
const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      totalCampaigns,
      activeSubscriptions,
      totalStorageUsed
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
      })
    ]);

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
        usersByRole: roleStats
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

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role })
    };

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
          storageUsed: true,
          storageLimit: true,
          subscriptionStatus: true,
          createdAt: true,
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

const getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(type && { type })
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.item.count({ where })
    ]);

    const itemsWithStringSize = items.map(item => ({
      ...item,
      fileSize: item.fileSize.toString()
    }));

    res.json({
      status: 'success',
      items: itemsWithStringSize,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch items'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, storageLimit, subscriptionStatus } = req.body;

    const updateData = {};
    if (role) updateData.role = role;
    if (storageLimit) updateData.storageLimit = BigInt(storageLimit);
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        subscriptionStatus: true
      }
    });

    res.json({
      status: 'success',
      message: 'User updated successfully',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString()
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

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await prisma.user.delete({
      where: { id: userId }
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

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { user: true }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    await prisma.item.delete({
      where: { id: itemId }
    });

    await prisma.user.update({
      where: { id: item.userId },
      data: {
        storageUsed: {
          decrement: item.fileSize
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete item'
    });
  }
};

const removeUserFromTeam = async (req, res) => {
  try {
    const { teamMemberId } = req.params;

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    if (teamMember.memberUserId) {
      try {
        await prisma.user.delete({
          where: { id: teamMember.memberUserId }
        });
        console.log(`✅ Admin removed team member and deleted user: ${teamMember.email}`);
        console.log(`   Organization: ${teamMember.user.name}`);
      } catch (deleteError) {
        await prisma.teamMember.delete({
          where: { id: teamMemberId }
        });
        console.log(`✅ Admin removed team member: ${teamMember.email}`);
      }
    } else {
      await prisma.teamMember.delete({
        where: { id: teamMemberId }
      });
      console.log(`✅ Admin removed team member: ${teamMember.email}`);
    }

    res.json({
      status: 'success',
      message: 'User removed from team successfully'
    });
  } catch (error) {
    console.error('Remove user from team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove user from team'
    });
  }
};

const sendPasswordReset = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: resetTokenExpiry
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://outbound-impact.vercel.app';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    console.log(`✅ Admin generated password reset for: ${user.email}`);
    console.log(`🔗 Reset link: ${resetLink}`);

    res.json({
      status: 'success',
      message: 'Password reset link generated',
      resetLink: resetLink,
      expiresIn: '1 hour'
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate password reset link'
    });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getAllItems,
  updateUser,
  deleteUser,
  deleteItem,
  removeUserFromTeam,
  sendPasswordReset
};