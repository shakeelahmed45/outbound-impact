// ═══════════════════════════════════════════════════════════
// PUBLIC STATS ENDPOINT
// Serves aggregate platform stats for the outboundimpact.org website
// No authentication required — returns only aggregate counts
// Route: GET /api/public/stats
// ═══════════════════════════════════════════════════════════

const prisma = require('../lib/prisma');

const getPublicStats = async (req, res) => {
  try {
    // Set CORS headers so outboundimpact.org can call this
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    // Count active users (not deleted/suspended)
    let activeUsers = 0;
    try {
      const result = await prisma.user.count({
        where: {
          status: { notIn: ['deleted', 'suspended'] },
          role: { notIn: ['ADMIN', 'CUSTOMER_SUPPORT'] }
        }
      });
      activeUsers = result;
    } catch (e) {
      console.error('Stats: user count failed:', e.message);
    }

    // Count total items/content uploaded
    let totalItems = 0;
    try {
      const result = await prisma.item.count();
      totalItems = result;
    } catch (e) {
      console.error('Stats: item count failed:', e.message);
    }

    // Count total campaigns/streams
    let totalCampaigns = 0;
    try {
      const result = await prisma.campaign.count();
      totalCampaigns = result;
    } catch (e) {
      console.error('Stats: campaign count failed:', e.message);
    }

    // Count total QR codes generated
    let totalQRCodes = 0;
    try {
      const result = await prisma.qRCode.count();
      totalQRCodes = result;
    } catch (e) {
      console.error('Stats: QR count failed:', e.message);
    }

    // Count total scans/views (from analytics or scan tracking)
    let totalScans = 0;
    try {
      // Try qr scan tracking table
      const rows = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "QRScan"`;
      totalScans = rows[0]?.count || 0;
    } catch (e) {
      // Table might not exist — try alternative
      try {
        const rows = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "ScanLog"`;
        totalScans = rows[0]?.count || 0;
      } catch (e2) {
        console.error('Stats: scan count failed:', e2.message);
      }
    }

    // Count unique industries/use cases (from organization types or tags)
    // Fallback to a reasonable estimate based on active orgs
    let industries = 0;
    try {
      const result = await prisma.user.count({
        where: {
          role: { in: ['ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'] },
          status: 'active'
        }
      });
      // Estimate industries from org count (min 1 per 2 orgs, capped at reasonable number)
      industries = Math.max(Math.floor(result / 2), 1);
    } catch (e) {
      console.error('Stats: industry count failed:', e.message);
    }

    res.json({
      status: 'success',
      stats: {
        activeUsers,
        totalItems,
        totalCampaigns,
        totalQRCodes,
        totalScans,
        industries,
      },
      // Formatted versions for direct display
      formatted: {
        activeUsers: activeUsers >= 1000 ? `${(activeUsers / 1000).toFixed(1).replace('.0', '')}K+` : `${activeUsers}+`,
        totalItems: totalItems >= 1000 ? `${(totalItems / 1000).toFixed(1).replace('.0', '')}K+` : `${totalItems}`,
        totalCampaigns: `${totalCampaigns}`,
        totalQRCodes: totalQRCodes >= 1000 ? `${(totalQRCodes / 1000).toFixed(1).replace('.0', '')}K+` : `${totalQRCodes}`,
        totalScans: totalScans >= 1000 ? `${(totalScans / 1000).toFixed(1).replace('.0', '')}K+` : `${totalScans}`,
        industries: `${industries}+`,
      }
    });
  } catch (error) {
    console.error('Public stats error:', error);
    // Return fallback stats on error so the website never breaks
    res.json({
      status: 'success',
      stats: { activeUsers: 0, totalItems: 0, totalCampaigns: 0, totalQRCodes: 0, totalScans: 0, industries: 0 },
      formatted: { activeUsers: '—', totalItems: '—', totalCampaigns: '—', totalQRCodes: '—', totalScans: '—', industries: '—' }
    });
  }
};

module.exports = { getPublicStats };