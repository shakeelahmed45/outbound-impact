// ═══════════════════════════════════════════════════════════
// middleware/auditMiddleware.js
// Auto-logs all successful write operations (POST/PUT/PATCH/DELETE)
// Drop this into server.js AFTER auth middleware
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map route patterns → human-readable action names
const ROUTE_ACTION_MAP = {
  // Uploads / Items
  'POST /api/upload/file':       'FILE_UPLOADED',
  'POST /api/upload/text':       'TEXT_POST_CREATED',
  'POST /api/upload/embed':      'EMBED_POST_CREATED',
  'PUT /api/items':              'ITEM_UPDATED',
  'DELETE /api/items':           'ITEM_DELETED',

  // Campaigns / Streams
  'POST /api/campaigns':         'CAMPAIGN_CREATED',
  'PUT /api/campaigns':          'CAMPAIGN_UPDATED',
  'DELETE /api/campaigns':       'CAMPAIGN_DELETED',

  // Cohorts
  'POST /api/cohorts':           'COHORT_CREATED',
  'PUT /api/cohorts':            'COHORT_UPDATED',
  'DELETE /api/cohorts':         'COHORT_DELETED',

  // Workflows
  'POST /api/workflows':         'WORKFLOW_CREATED',
  'PUT /api/workflows':          'WORKFLOW_UPDATED',
  'DELETE /api/workflows':       'WORKFLOW_DELETED',

  // Organizations
  'POST /api/organizations':     'ORG_CREATED',
  'PUT /api/organizations':      'ORG_UPDATED',
  'DELETE /api/organizations':   'ORG_DELETED',

  // Team
  'POST /api/team/invite':       'TEAM_MEMBER_INVITED',
  'DELETE /api/team/members':     'TEAM_MEMBER_REMOVED',
  'PUT /api/team/members':        'TEAM_ROLE_CHANGED',

  // Account
  'PUT /api/user/profile':        'PROFILE_UPDATED',
  'PUT /api/user/password':       'PASSWORD_CHANGED',
  'DELETE /api/user/account':     'ACCOUNT_DELETED',

  // Security
  'POST /api/security/2fa/verify':  'TWO_FA_ENABLED',
  'POST /api/security/2fa/disable': 'TWO_FA_DISABLED',

  // Subscription
  'POST /api/subscription/cancel':    'SUBSCRIPTION_CANCELED',
  'PUT /api/subscription/auto-renew': 'SUBSCRIPTION_RENEWED',
};

// Routes to SKIP logging (read-only, high-frequency, or internal)
const SKIP_PATTERNS = [
  '/api/auth/login',        // Logged separately with success/fail detail
  '/api/auth/register',     // Logged separately
  '/api/chat',              // Too noisy
  '/api/analytics',         // Read-only
  '/api/dashboard',         // Read-only
  '/api/audit',             // Don't log auditing the audit log
  '/api/admin',             // Admin has separate logging
  '/api/campaigns/track',   // QR scan tracking — too high volume
];

/**
 * Resolves a request to a human-readable action name.
 * Tries exact match first, then prefix match.
 */
function resolveAction(method, path) {
  // Exact match first (without IDs)
  const exactKey = `${method} ${path}`;
  if (ROUTE_ACTION_MAP[exactKey]) return ROUTE_ACTION_MAP[exactKey];

  // Strip trailing IDs and try prefix match
  // e.g. "DELETE /api/items/abc-123" → "DELETE /api/items"
  const basePath = path.replace(/\/[a-f0-9-]{8,}.*$/i, '').replace(/\/\d+.*$/, '');
  const baseKey = `${method} ${basePath}`;
  if (ROUTE_ACTION_MAP[baseKey]) return ROUTE_ACTION_MAP[baseKey];

  // Special cases with sub-paths
  if (method === 'POST' && path.includes('/cohorts/') && path.includes('/members')) return 'COHORT_MEMBER_ADDED';
  if (method === 'DELETE' && path.includes('/cohorts/') && path.includes('/members')) return 'COHORT_MEMBER_REMOVED';
  if (method === 'POST' && path.includes('/cohorts/') && path.includes('/import')) return 'COHORT_MEMBERS_IMPORTED';
  if (method === 'PUT' && path.includes('/cohorts/') && path.includes('/streams')) return 'COHORT_STREAMS_ASSIGNED';
  if (method === 'PUT' && path.includes('/workflows/') && path.includes('/submit')) return 'WORKFLOW_SUBMITTED';
  if (method === 'PUT' && path.includes('/workflows/') && path.includes('/approve')) return 'WORKFLOW_APPROVED';
  if (method === 'PUT' && path.includes('/workflows/') && path.includes('/request-changes')) return 'WORKFLOW_CHANGES_REQUESTED';
  if (method === 'POST' && path.includes('/campaigns/') && path.includes('/items')) return 'CAMPAIGN_ITEM_ADDED';
  if (method === 'DELETE' && path.includes('/campaigns/') && path.includes('/items')) return 'CAMPAIGN_ITEM_REMOVED';
  if (method === 'POST' && path.includes('/organizations/') && path.includes('/members')) return 'ORG_MEMBER_ASSIGNED';
  if (method === 'DELETE' && path.includes('/organizations/') && path.includes('/members')) return 'ORG_MEMBER_REMOVED';
  if (path.includes('/team/invitation') && method === 'POST') return 'TEAM_INVITATION_ACCEPTED';

  return null; // Unknown route — don't log
}

/**
 * Middleware: automatically log all successful write operations.
 * Wraps res.json to capture the response status.
 */
const auditMiddleware = (req, res, next) => {
  // Only log write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip noisy routes
  if (SKIP_PATTERNS.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }

  // Override res.json to capture response after controller finishes
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Only log successful responses (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = resolveAction(req.method, req.originalUrl);

      if (action && req.user?.userId) {
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.headers['x-real-ip']
          || req.socket?.remoteAddress
          || null;

        const device = req.headers['user-agent'] || null;

        // Build metadata from request body (sanitize sensitive fields)
        const metadata = {};
        if (req.body?.title) metadata.title = req.body.title;
        if (req.body?.name) metadata.name = req.body.name;
        if (req.body?.assetName) metadata.assetName = req.body.assetName;
        if (req.body?.email) metadata.email = req.body.email;
        if (req.body?.role) metadata.role = req.body.role;
        if (req.body?.type) metadata.type = req.body.type;
        if (req.body?.status) metadata.status = req.body.status;

        // Capture resource ID from URL params or response body
        const urlId = req.originalUrl.match(/\/([a-f0-9-]{36})/)?.[1];
        if (urlId) metadata.resourceId = urlId;
        if (body?.item?.id) metadata.resourceId = body.item.id;
        if (body?.campaign?.id) metadata.resourceId = body.campaign.id;
        if (body?.cohort?.id) metadata.resourceId = body.cohort.id;
        if (body?.workflow?.id) metadata.resourceId = body.workflow.id;

        // Fire-and-forget — never block the response
        prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action,
            ipAddress,
            device,
            metadata,
          }
        }).catch(err => {
          console.error('⚠️ Audit middleware log failed:', err.message);
        });
      }
    }

    return originalJson(body);
  };

  next();
};

module.exports = auditMiddleware;