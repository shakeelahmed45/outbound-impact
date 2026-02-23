// ═══════════════════════════════════════════════════════════
// controllers/advancedAnalyticsController.js
// Comprehensive analytics pulling from ALL data sources:
// Items, Campaigns, Analytics, Organizations, Cohorts,
// Workflows, TeamMembers, Messages, AuditLogs
// ═══════════════════════════════════════════════════════════

const prisma = require('../lib/prisma');
const { buildOrgFilter } = require('../helpers/orgScope');

// ─── Time Range Helper ───────────────────────────
function getStartDate(timeRange) {
  const now = new Date();
  const start = new Date();
  switch (timeRange) {
    case '24h': start.setHours(now.getHours() - 24); break;
    case '7d': start.setDate(now.getDate() - 7); break;
    case '30d': start.setDate(now.getDate() - 30); break;
    case '90d': start.setDate(now.getDate() - 90); break;
    case '1y': start.setFullYear(now.getFullYear() - 1); break;
    default: start.setDate(now.getDate() - 7);
  }
  return start;
}

// ─── Country Code Mapping ────────────────────────
function getCountryCode(name) {
  const codes = {
    'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Germany': 'DE',
    'Australia': 'AU', 'France': 'FR', 'India': 'IN', 'Japan': 'JP', 'China': 'CN',
    'Brazil': 'BR', 'Pakistan': 'PK', 'Mexico': 'MX', 'Italy': 'IT', 'Spain': 'ES',
    'South Korea': 'KR', 'Netherlands': 'NL', 'Turkey': 'TR', 'Indonesia': 'ID',
    'Saudi Arabia': 'SA', 'Nigeria': 'NG', 'Argentina': 'AR', 'Russia': 'RU',
    'South Africa': 'ZA', 'Egypt': 'EG', 'Thailand': 'TH', 'Philippines': 'PH',
    'Vietnam': 'VN', 'Poland': 'PL', 'Sweden': 'SE', 'Belgium': 'BE',
    'Switzerland': 'CH', 'Austria': 'AT', 'Ireland': 'IE', 'Norway': 'NO',
    'Denmark': 'DK', 'Singapore': 'SG', 'Malaysia': 'MY', 'New Zealand': 'NZ',
    'Portugal': 'PT', 'Greece': 'GR', 'Czech Republic': 'CZ', 'Romania': 'RO',
    'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE', 'UAE': 'AE', 'Israel': 'IL',
    'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Kenya': 'KE', 'Ghana': 'GH',
    'Unknown': 'XX',
  };
  return codes[name] || 'XX';
}

// ═══════════════════════════════════════════════════════════
// GET /advanced-analytics/stats
// Main comprehensive analytics endpoint
// ═══════════════════════════════════════════════════════════
const getAdvancedAnalytics = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { timeRange = '7d' } = req.query;
    const startDate = getStartDate(timeRange);
    const orgFilter = buildOrgFilter(req);

    // ──────────────────────────────────────
    // 1. ITEMS DATA
    // ──────────────────────────────────────
    const items = await prisma.item.findMany({
      where: { userId, ...orgFilter },
      select: {
        id: true, title: true, type: true, views: true,
        viewsQr: true, viewsNfc: true, viewsDirect: true,
        fileSize: true, sharingEnabled: true, campaignId: true,
        organizationId: true, createdAt: true,
      },
    });

    const itemIds = items.map(i => i.id);

    // ──────────────────────────────────────
    // 2. ANALYTICS EVENTS (time-filtered)
    // ──────────────────────────────────────
    const analyticsEvents = itemIds.length > 0
      ? await prisma.analytics.findMany({
          where: { itemId: { in: itemIds }, createdAt: { gte: startDate } },
          select: { id: true, source: true, country: true, device: true, browser: true, os: true, createdAt: true, itemId: true },
        })
      : [];

    // ──────────────────────────────────────
    // 3. CAMPAIGNS (STREAMS)
    // ──────────────────────────────────────
    const campaigns = await prisma.campaign.findMany({
      where: { userId, ...orgFilter },
      select: {
        id: true, name: true, slug: true, category: true, views: true,
        viewsQr: true, viewsNfc: true, passwordProtected: true,
        organizationId: true, createdAt: true,
        items: { select: { id: true } },
      },
    });

    // ──────────────────────────────────────
    // 4. ORGANIZATIONS
    // ──────────────────────────────────────
    const organizations = await prisma.organization.findMany({
      where: { userId },
      select: {
        id: true, name: true, status: true,
        items: { select: { id: true } },
        campaigns: { select: { id: true } },
        members: { select: { id: true } },
      },
    });

    // ──────────────────────────────────────
    // 5. COHORTS
    // ──────────────────────────────────────
    const cohorts = await prisma.cohort.findMany({
      where: { userId },
      select: {
        id: true, name: true, status: true,
        members: { select: { id: true } },
        streams: { select: { id: true } },
      },
    });

    // ──────────────────────────────────────
    // 6. WORKFLOWS
    // ──────────────────────────────────────
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      select: { id: true, status: true, assetType: true, submittedByName: true, createdAt: true },
    });

    // ──────────────────────────────────────
    // 7. TEAM MEMBERS
    // ──────────────────────────────────────
    const effectiveOwnerId = req.effectiveUserId;
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: effectiveOwnerId, status: 'ACCEPTED' },
      select: { id: true, role: true, email: true, memberUserId: true },
    });

    // ──────────────────────────────────────
    // 8. MESSAGES (time-filtered)
    // ──────────────────────────────────────
    let messagesSent = 0;
    let messagesReceived = 0;
    let messagesInternal = 0;
    let messagesExternal = 0;
    try {
      messagesSent = await prisma.message.count({
        where: { senderId: userId, createdAt: { gte: startDate } },
      });
      messagesReceived = await prisma.message.count({
        where: { recipientId: userId, createdAt: { gte: startDate } },
      });
      messagesInternal = await prisma.message.count({
        where: { OR: [{ senderId: userId }, { recipientId: userId }], type: 'internal', createdAt: { gte: startDate } },
      });
      messagesExternal = await prisma.message.count({
        where: { OR: [{ senderId: userId }, { recipientId: userId }], type: 'external', createdAt: { gte: startDate } },
      });
    } catch { /* Message model may not exist yet */ }

    // ──────────────────────────────────────
    // 9. AUDIT LOGS (time-filtered)
    // ──────────────────────────────────────
    let auditCount = 0;
    try {
      auditCount = await prisma.auditLog.count({
        where: { userId, createdAt: { gte: startDate } },
      });
    } catch { /* Non-critical */ }

    // ══════════════════════════════════════
    // COMPUTE ALL ANALYTICS
    // ══════════════════════════════════════

    const totalViews = analyticsEvents.length;

    // --- Unique Visitors ---
    const uniqueVisitors = new Set(
      analyticsEvents.map(a => `${a.country}-${a.device}-${a.browser}`)
    ).size;

    // --- Session Time & Bounce Rate ---
    const visitorSessions = {};
    analyticsEvents.forEach(a => {
      const key = `${a.country}-${a.device}-${a.browser}`;
      if (!visitorSessions[key]) visitorSessions[key] = [];
      visitorSessions[key].push(new Date(a.createdAt));
    });

    const sessionTimes = [];
    Object.values(visitorSessions).forEach(sessions => {
      if (sessions.length > 1) {
        sessions.sort((a, b) => a - b);
        for (let i = 1; i < sessions.length; i++) {
          const dur = (sessions[i] - sessions[i - 1]) / 1000;
          if (dur < 1800) sessionTimes.push(dur);
        }
      }
    });

    let avgSessionTime = '0m 0s';
    if (sessionTimes.length > 0) {
      const avg = sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length;
      avgSessionTime = `${Math.floor(avg / 60)}m ${Math.floor(avg % 60)}s`;
    }

    const singlePage = Object.values(visitorSessions).filter(s => s.length === 1).length;
    const totalSessions = Object.keys(visitorSessions).length;
    const bounceRate = totalSessions > 0 ? `${Math.round((singlePage / totalSessions) * 100)}%` : '0%';

    // --- Top Countries ---
    const countryMap = {};
    analyticsEvents.forEach(a => {
      const c = a.country || 'Unknown';
      countryMap[c] = (countryMap[c] || 0) + 1;
    });
    const topCountries = Object.entries(countryMap)
      .map(([country, views]) => ({
        country, code: getCountryCode(country), views,
        percentage: totalViews > 0 ? Math.round((views / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // --- Devices ---
    const deviceMap = { Mobile: 0, Desktop: 0, Tablet: 0 };
    analyticsEvents.forEach(a => {
      const d = a.device || 'Desktop';
      if (deviceMap.hasOwnProperty(d)) deviceMap[d]++;
    });
    const devices = Object.entries(deviceMap).map(([type, count]) => ({
      type, count, percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
    }));

    // --- Browsers ---
    const browserMap = {};
    analyticsEvents.forEach(a => {
      const b = a.browser || 'Other';
      browserMap[b] = (browserMap[b] || 0) + 1;
    });
    const browsers = Object.entries(browserMap)
      .map(([name, count]) => ({ name, count, percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 6);

    // --- Operating Systems ---
    const osMap = {};
    analyticsEvents.forEach(a => {
      const o = a.os || 'Other';
      osMap[o] = (osMap[o] || 0) + 1;
    });
    const osList = Object.entries(osMap)
      .map(([name, count]) => ({ name, count, percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 6);

    // --- Hourly Views ---
    const hourlyCount = Array(8).fill(0);
    analyticsEvents.forEach(a => {
      const block = Math.floor(new Date(a.createdAt).getHours() / 3);
      hourlyCount[block]++;
    });
    const hourlyViews = [
      { hour: '00:00', views: hourlyCount[0] }, { hour: '03:00', views: hourlyCount[1] },
      { hour: '06:00', views: hourlyCount[2] }, { hour: '09:00', views: hourlyCount[3] },
      { hour: '12:00', views: hourlyCount[4] }, { hour: '15:00', views: hourlyCount[5] },
      { hour: '18:00', views: hourlyCount[6] }, { hour: '21:00', views: hourlyCount[7] },
    ];

    // --- Daily Trend (views per day) ---
    const dailyMap = {};
    analyticsEvents.forEach(a => {
      const day = new Date(a.createdAt).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyTrend = Object.entries(dailyMap)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Source Breakdown (QR / NFC / Direct) ---
    const sourceMap = { qr: 0, nfc: 0, direct: 0 };
    analyticsEvents.forEach(a => {
      const s = (a.source || 'direct').toLowerCase();
      if (s === 'qr') sourceMap.qr++;
      else if (s === 'nfc') sourceMap.nfc++;
      else sourceMap.direct++;
    });
    const totalSourceViews = sourceMap.qr + sourceMap.nfc + sourceMap.direct;
    const deliverySources = {
      qr: { count: sourceMap.qr, percentage: totalSourceViews > 0 ? Math.round((sourceMap.qr / totalSourceViews) * 100) : 0 },
      nfc: { count: sourceMap.nfc, percentage: totalSourceViews > 0 ? Math.round((sourceMap.nfc / totalSourceViews) * 100) : 0 },
      direct: { count: sourceMap.direct, percentage: totalSourceViews > 0 ? Math.round((sourceMap.direct / totalSourceViews) * 100) : 0 },
    };

    // --- Daily Source Trend ---
    const dailySourceMap = {};
    analyticsEvents.forEach(a => {
      const day = new Date(a.createdAt).toISOString().split('T')[0];
      if (!dailySourceMap[day]) dailySourceMap[day] = { qr: 0, nfc: 0, direct: 0 };
      const s = (a.source || 'direct').toLowerCase();
      if (s === 'qr') dailySourceMap[day].qr++;
      else if (s === 'nfc') dailySourceMap[day].nfc++;
      else dailySourceMap[day].direct++;
    });
    const dailySourceTrend = Object.entries(dailySourceMap)
      .map(([date, sources]) => ({ date, ...sources }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── CONTENT ANALYTICS ────────────────
    const totalItems = items.length;
    const totalStorageBytes = items.reduce((sum, i) => sum + Number(i.fileSize || 0), 0);
    const totalStorageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);

    // Items by media type
    const mediaTypeMap = {};
    items.forEach(i => {
      const t = i.type || 'OTHER';
      if (!mediaTypeMap[t]) mediaTypeMap[t] = { count: 0, views: 0, storage: 0 };
      mediaTypeMap[t].count++;
      mediaTypeMap[t].views += (i.views || 0);
      mediaTypeMap[t].storage += Number(i.fileSize || 0);
    });
    const contentByType = Object.entries(mediaTypeMap).map(([type, data]) => ({
      type,
      count: data.count,
      views: data.views,
      storageMB: (data.storage / (1024 * 1024)).toFixed(1),
      percentage: totalItems > 0 ? Math.round((data.count / totalItems) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Top items by views
    const topItems = [...items]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(i => ({
        id: i.id, title: i.title || 'Untitled', type: i.type,
        views: i.views, viewsQr: i.viewsQr, viewsNfc: i.viewsNfc, viewsDirect: i.viewsDirect,
      }));

    // Sharing status
    const sharingEnabled = items.filter(i => i.sharingEnabled).length;
    const sharingDisabled = items.filter(i => !i.sharingEnabled).length;

    // Items created in time range
    const itemsCreatedInRange = items.filter(i => new Date(i.createdAt) >= startDate).length;

    // ── STREAM (CAMPAIGN) ANALYTICS ──────
    const totalStreams = campaigns.length;
    const totalStreamViews = campaigns.reduce((sum, c) => sum + (c.views || 0), 0);

    // Top streams
    const topStreams = [...campaigns]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(c => ({
        id: c.id, name: c.name, category: c.category || 'Uncategorized',
        views: c.views, viewsQr: c.viewsQr, viewsNfc: c.viewsNfc,
        itemCount: c.items?.length || 0, passwordProtected: c.passwordProtected,
      }));

    // Category breakdown
    const categoryMap = {};
    campaigns.forEach(c => {
      const cat = c.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, views: 0 };
      categoryMap[cat].count++;
      categoryMap[cat].views += (c.views || 0);
    });
    const streamCategories = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.views - a.views);

    // Password protection stats
    const passwordProtectedStreams = campaigns.filter(c => c.passwordProtected).length;
    const publicStreams = campaigns.filter(c => !c.passwordProtected).length;

    // ── ORGANIZATION ANALYTICS ───────────
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter(o => o.status === 'active').length;
    const orgBreakdown = organizations.map(o => ({
      id: o.id, name: o.name, status: o.status,
      itemCount: o.items?.length || 0,
      streamCount: o.campaigns?.length || 0,
      memberCount: o.members?.length || 0,
    })).sort((a, b) => b.itemCount - a.itemCount);

    // ── COHORT ANALYTICS ─────────────────
    const totalCohorts = cohorts.length;
    const activeCohorts = cohorts.filter(c => c.status === 'active').length;
    const totalCohortMembers = cohorts.reduce((sum, c) => sum + (c.members?.length || 0), 0);
    const totalCohortStreams = cohorts.reduce((sum, c) => sum + (c.streams?.length || 0), 0);
    const cohortBreakdown = cohorts.map(c => ({
      id: c.id, name: c.name, status: c.status,
      memberCount: c.members?.length || 0,
      streamCount: c.streams?.length || 0,
    })).sort((a, b) => b.memberCount - a.memberCount);

    // ── WORKFLOW ANALYTICS ────────────────
    const totalWorkflows = workflows.length;
    const workflowStatusMap = {};
    workflows.forEach(w => {
      const s = w.status || 'DRAFT';
      workflowStatusMap[s] = (workflowStatusMap[s] || 0) + 1;
    });
    const workflowStatuses = Object.entries(workflowStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const workflowsInRange = workflows.filter(w => new Date(w.createdAt) >= startDate).length;

    // Workflow asset types
    const assetTypeMap = {};
    workflows.forEach(w => {
      const t = w.assetType || 'Unknown';
      assetTypeMap[t] = (assetTypeMap[t] || 0) + 1;
    });
    const workflowAssetTypes = Object.entries(assetTypeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // ── TEAM ANALYTICS ───────────────────
    const totalTeamMembers = teamMembers.length;
    const roleMap = {};
    teamMembers.forEach(tm => {
      const r = tm.role || 'VIEWER';
      roleMap[r] = (roleMap[r] || 0) + 1;
    });
    const teamRoles = Object.entries(roleMap)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // ── MESSAGING ANALYTICS ──────────────
    const totalMessages = messagesSent + messagesReceived;

    // ══════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════
    res.json({
      status: 'success',
      analytics: {
        // Overview
        totalViews,
        uniqueVisitors,
        avgSessionTime,
        bounceRate,
        totalItems,
        totalStreams,
        totalStorageGB,
        itemsCreatedInRange,

        // Engagement
        topCountries,
        devices,
        browsers,
        os: osList,
        hourlyViews,
        dailyTrend,

        // Delivery sources
        deliverySources,
        dailySourceTrend,

        // Content
        contentByType,
        topItems,
        sharingEnabled,
        sharingDisabled,

        // Streams
        totalStreamViews,
        topStreams,
        streamCategories,
        passwordProtectedStreams,
        publicStreams,

        // Organizations
        totalOrgs,
        activeOrgs,
        orgBreakdown,

        // Cohorts
        totalCohorts,
        activeCohorts,
        totalCohortMembers,
        totalCohortStreams,
        cohortBreakdown,

        // Workflows
        totalWorkflows,
        workflowsInRange,
        workflowStatuses,
        workflowAssetTypes,

        // Team
        totalTeamMembers,
        teamRoles,

        // Messaging
        messagesSent,
        messagesReceived,
        messagesInternal,
        messagesExternal,
        totalMessages,

        // Audit
        auditCount,
      },
    });
  } catch (error) {
    console.error('❌ Advanced analytics error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch advanced analytics' });
  }
};

module.exports = { getAdvancedAnalytics };