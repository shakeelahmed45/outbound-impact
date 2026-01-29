const { verifyAccessToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════════════
// EXISTING: Auth Middleware (unchanged)
// ═══════════════════════════════════════════════════════════
const authMiddleware = (req, res, next) => {
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
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// EXISTING: Require Admin (unchanged)
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
// 🆕 NEW: Require FULL ADMIN (not customer support)
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
// 🆕 NEW: Require CUSTOMER_SUPPORT or ADMIN (for Live Chat)
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
// 🆕 NEW: Check if user has specific permission
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
// 🆕 NEW: Get user permissions helper
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
// EXPORTS (keeping your original export pattern)
// ═══════════════════════════════════════════════════════════
module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireFullAdmin = requireFullAdmin;        // 🆕 NEW
module.exports.requireSupportAccess = requireSupportAccess; // 🆕 NEW
module.exports.hasPermission = hasPermission;               // 🆕 NEW
module.exports.getUserPermissions = getUserPermissions;     // 🆕 NEW