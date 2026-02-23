// ═══════════════════════════════════════════════════════════
// controllers/auditController.js
// Enterprise audit log endpoint — org-scoped, filterable
// FIXED: Removed raw SQL, all queries use safe Prisma ORM
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /audit/logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const effectiveUserId = req.effectiveUserId || req.user.userId;
    const {
      page = 1,
      limit = 50,
      action,
      user: userName,
      startDate,
      endDate,
      search,
    } = req.query;

    const take = Math.min(parseInt(limit) || 50, 200);
    const skip = ((parseInt(page) || 1) - 1) * take;

    // Step 1: Find all userIds for this account
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: effectiveUserId, memberUserId: { not: null }, status: 'ACCEPTED' },
      select: { memberUserId: true },
    });
    const allUserIds = [effectiveUserId, ...teamMembers.map(tm => tm.memberUserId).filter(Boolean)];

    // Step 2: Build WHERE clause
    const where = {
      userId: { in: allUserIds },
    };

    if (action && action !== 'all') {
      where.action = action;
    }

    if (userName) {
      where.user = {
        name: { contains: userName, mode: 'insensitive' },
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Step 3: Query logs + total count
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          action: true,
          ipAddress: true,
          device: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Step 4: Get unique action types for filter dropdown
    let actionTypes = [];
    try {
      actionTypes = await prisma.auditLog.groupBy({
        by: ['action'],
        where: { userId: { in: allUserIds } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      });
    } catch (groupErr) {
      console.error('⚠️ Action types groupBy failed:', groupErr.message);
    }

    res.json({
      status: 'success',
      logs,
      total,
      page: parseInt(page) || 1,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
      actionTypes: actionTypes.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
    });

  } catch (error) {
    console.error('❌ Audit logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch audit logs',
      detail: error.message,
    });
  }
};

/**
 * GET /audit/stats
 */
const getAuditStats = async (req, res) => {
  try {
    const effectiveUserId = req.effectiveUserId || req.user.userId;

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: effectiveUserId, memberUserId: { not: null }, status: 'ACCEPTED' },
      select: { memberUserId: true },
    });
    const allUserIds = [effectiveUserId, ...teamMembers.map(tm => tm.memberUserId).filter(Boolean)];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [totalLogs, todayCount, weekCount, uniqueUsers] = await Promise.all([
      prisma.auditLog.count({
        where: { userId: { in: allUserIds } },
      }),
      prisma.auditLog.count({
        where: {
          userId: { in: allUserIds },
          createdAt: { gte: todayStart },
        },
      }),
      prisma.auditLog.count({
        where: {
          userId: { in: allUserIds },
          createdAt: { gte: weekStart },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: allUserIds },
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    res.json({
      status: 'success',
      stats: {
        totalLogs,
        todayCount,
        weekCount,
        activeUsers: uniqueUsers.length,
        teamSize: allUserIds.length,
      },
    });
  } catch (error) {
    console.error('❌ Audit stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch audit stats',
      detail: error.message,
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditStats,
};