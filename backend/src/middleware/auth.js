const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');
const { getSettings, clearCache } = require('../services/settingsHelper');

// ═══════════════════════════════════════════════════════════
// MAINTENANCE MODE CACHE — Uses settingsHelper's unified cache
// so admin settings saves clear both caches at once.
// The clearMaintenanceCache export is kept for backward compat.
// ═══════════════════════════════════════════════════════════
const checkMaintenanceMode = async () => {
  try {
    const settings = await getSettings();
    return settings.maintenanceMode === true;
  } catch (e) {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Token + Suspended + Maintenance + Session Timeout
// ═══════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    req.user = decoded;

    // ─── Skip ALL enforcement checks for ADMIN users ───
    if (decoded.role === 'ADMIN') {
      return next();
    }

    // ─── CHECK 1: Session timeout enforcement ───
    try {
      const settings = await getSettings();
      const timeoutMinutes = settings.sessionTimeoutMinutes;
      if (timeoutMinutes && decoded.iat) {
        const issuedAt = decoded.iat * 1000; // JWT iat is in seconds
        const maxAge = timeoutMinutes * 60 * 1000; // Convert to ms
        if (Date.now() - issuedAt > maxAge) {
          return res.status(401).json({
            status: 'error',
            code: 'SESSION_EXPIRED',
            message: `Your session has expired after ${timeoutMinutes} minutes of inactivity. Please sign in again.`
          });
        }
      }
    } catch (e) {
      // Session timeout check failure should NOT block — graceful degradation
      console.error('⚠️ Session timeout check failed (allowing through):', e.message);
    }

    // ─── CHECK 2: Is user suspended? (DB lookup) ───
    // ✅ FIX: Use decoded.userId (matches JWT payload), not decoded.id
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { status: true }
      });

      if (dbUser && dbUser.status === 'suspended') {
        console.log(`🚫 Blocked suspended user: ${decoded.email || decoded.userId}`);
        return res.status(403).json({
          status: 'error',
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support@outboundimpact.org for assistance.'
        });
      }
    } catch (dbErr) {
      // DB check failure should NOT block the user — graceful degradation
      console.error('⚠️ Suspension check failed (allowing through):', dbErr.message);
    }

    // ─── CHECK 3: Is platform in maintenance mode? ───
    try {
      const isMaintenanceMode = await checkMaintenanceMode();
      if (isMaintenanceMode) {
        console.log(`🔧 Maintenance mode blocking user: ${decoded.email || decoded.userId}`);
        return res.status(503).json({
          status: 'error',
          code: 'MAINTENANCE_MODE',
          message: 'Outbound Impact is currently undergoing scheduled maintenance. Please try again shortly.'
        });
      }
    } catch (maintErr) {
      // Maintenance check failure should NOT block — graceful degradation
      console.error('⚠️ Maintenance check failed (allowing through):', maintErr.message);
    }

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// Require Admin
// ═══════════════════════════════════════════════════════════
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required'
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════
// Require FULL ADMIN (not customer support)
// ═══════════════════════════════════════════════════════════
const requireFullAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Full admin access required'
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════
// Require CUSTOMER_SUPPORT or ADMIN (for Live Chat)
// ═══════════════════════════════════════════════════════════
const requireSupportAccess = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'CUSTOMER_SUPPORT')) {
    return res.status(403).json({
      status: 'error',
      message: 'Support access required'
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════
// Check if user has specific permission
// ═══════════════════════════════════════════════════════════
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const role = req.user.role;
    
    const permissions = {
      ADMIN: [
        'view_dashboard',
        'manage_users',
        'manage_items',
        'manage_feedback',
        'manage_live_chat',
        'manage_team',
        'view_analytics',
        'manage_settings',
      ],
      CUSTOMER_SUPPORT: [
        'manage_live_chat', // ONLY THIS!
      ],
    };

    const userPermissions = permissions[role] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        status: 'error',
        message: `Permission denied: ${permission}`,
      });
    }

    next();
  };
};

// ═══════════════════════════════════════════════════════════
// Get user permissions helper
// ═══════════════════════════════════════════════════════════
const getUserPermissions = (role) => {
  const permissions = {
    ADMIN: {
      canViewDashboard: true,
      canManageUsers: true,
      canManageItems: true,
      canManageFeedback: true,
      canManageLiveChat: true,
      canManageTeam: true,
      canViewAnalytics: true,
      canManageSettings: true,
    },
    CUSTOMER_SUPPORT: {
      canViewDashboard: false,
      canManageUsers: false,
      canManageItems: false,
      canManageFeedback: false,
      canManageLiveChat: true,  // ONLY THIS!
      canManageTeam: false,
      canViewAnalytics: false,
      canManageSettings: false,
    },
    // Regular users have no admin permissions
    INDIVIDUAL: {},
    ORG_SMALL: {},
    ORG_MEDIUM: {},
    ORG_ENTERPRISE: {},
  };

  return permissions[role] || {};
};

// ═══════════════════════════════════════════════════════════
// Helper: Force-clear maintenance mode cache
// Now delegates to settingsHelper.clearCache() for unified caching.
// Kept as named export for backward compatibility with adminSettingsController.
// ═══════════════════════════════════════════════════════════
const clearMaintenanceCache = () => {
  clearCache();
};

// ═══════════════════════════════════════════════════════════
// EXPORTS — All original exports preserved
// ═══════════════════════════════════════════════════════════
module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireFullAdmin = requireFullAdmin;
module.exports.requireSupportAccess = requireSupportAccess;
module.exports.hasPermission = hasPermission;
module.exports.getUserPermissions = getUserPermissions;
module.exports.clearMaintenanceCache = clearMaintenanceCache;