const prisma = require('../lib/prisma');

const getPublicStats = async (req, res) => {
  try {
    // Set CORS headers so outboundimpact.org can call this
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 min

    // ── 1. Count active users (exclude admins, deleted, suspended) ──
    let activeUsers = 0;
    try {
      activeUsers = await prisma.user.count({
        where: {
          status: { notIn: ['deleted', 'suspended'] },
          role: { notIn: ['ADMIN', 'CUSTOMER_SUPPORT'] }
        }
      });
    } catch (e) {
      console.error('Stats: user count failed:', e.message);
    }

    // ── 2. Count total content items uploaded ──
    let totalItems = 0;
    try {
      totalItems = await prisma.item.count();
    } catch (e) {
      console.error('Stats: item count failed:', e.message);
    }

    // ── 3. Count total campaigns/streams ──
    let totalCampaigns = 0;
    try {
      totalCampaigns = await prisma.campaign.count();
    } catch (e) {
      console.error('Stats: campaign count failed:', e.message);
    }

    // ── 4. Count QR codes — items or campaigns that have a qrCodeUrl set ──
    let totalQRCodes = 0;
    try {
      const itemQRs = await prisma.item.count({
        where: { qrCodeUrl: { not: null } }
      });
      const campaignQRs = await prisma.campaign.count({
        where: { qrCodeUrl: { not: null } }
      });
      totalQRCodes = itemQRs + campaignQRs;
    } catch (e) {
      console.error('Stats: QR count failed:', e.message);
    }

    // ── 5. Count total scans/views from the Analytics table ──
    let totalScans = 0;
    try {
      totalScans = await prisma.analytics.count();
    } catch (e) {
      console.error('Stats: analytics count failed:', e.message);
    }

    // ── 6. Count total organizations ──
    let totalOrganizations = 0;
    try {
      totalOrganizations = await prisma.organization.count({
        where: { status: 'active' }
      });
    } catch (e) {
      console.error('Stats: org count failed:', e.message);
    }

    // ── Format numbers for display ──
    function fmt(n) {
      if (n >= 10000) return (n / 1000).toFixed(0) + 'K+';
      if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
      if (n > 0) return n.toLocaleString();
      return '0';
    }

    res.json({
      status: 'success',
      stats: {
        activeUsers,
        totalItems,
        totalCampaigns,
        totalQRCodes,
        totalScans,
        totalOrganizations,
      },
      formatted: {
        activeUsers: fmt(activeUsers),
        totalItems: fmt(totalItems),
        totalCampaigns: fmt(totalCampaigns),
        totalQRCodes: fmt(totalQRCodes),
        totalScans: fmt(totalScans),
        totalOrganizations: fmt(totalOrganizations),
      }
    });
  } catch (error) {
    console.error('Public stats error:', error);
    // Return fallback on error so the website never breaks
    res.json({
      status: 'error',
      stats: { activeUsers: 0, totalItems: 0, totalCampaigns: 0, totalQRCodes: 0, totalScans: 0, totalOrganizations: 0 },
      formatted: { activeUsers: '—', totalItems: '—', totalCampaigns: '—', totalQRCodes: '—', totalScans: '—', totalOrganizations: '—' }
    });
  }
};

module.exports = { getPublicStats };