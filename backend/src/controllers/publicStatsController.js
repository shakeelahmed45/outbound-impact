// ═══════════════════════════════════════════════════════════
// PUBLIC STATS ENDPOINT — SUPPORTS JSON + JSONP
// JSON:  GET /api/public/stats          → returns JSON
// JSONP: GET /api/public/stats.js       → returns <script> (bypasses CORS)
// ═══════════════════════════════════════════════════════════

const prisma = require('../lib/prisma');

async function gatherStats() {
  let activeUsers = 0, totalItems = 0, totalCampaigns = 0, totalQRCodes = 0, totalScans = 0, totalOrganizations = 0;

  try { activeUsers = await prisma.user.count({ where: { status: { notIn: ['deleted', 'suspended'] }, role: { notIn: ['ADMIN', 'CUSTOMER_SUPPORT'] } } }); } catch (e) { console.error('Stats: user count failed:', e.message); }
  try { totalItems = await prisma.item.count(); } catch (e) { console.error('Stats: item count failed:', e.message); }
  try { totalCampaigns = await prisma.campaign.count(); } catch (e) { console.error('Stats: campaign count failed:', e.message); }
  try {
    const a = await prisma.item.count({ where: { qrCodeUrl: { not: null } } });
    const b = await prisma.campaign.count({ where: { qrCodeUrl: { not: null } } });
    totalQRCodes = a + b;
  } catch (e) { console.error('Stats: QR count failed:', e.message); }
  try { totalScans = await prisma.analytics.count(); } catch (e) { console.error('Stats: analytics count failed:', e.message); }
  try { totalOrganizations = await prisma.organization.count({ where: { status: 'active' } }); } catch (e) { console.error('Stats: org count failed:', e.message); }

  function fmt(n) {
    if (n >= 10000) return (n / 1000).toFixed(0) + 'K+';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
    if (n > 0) return n.toLocaleString();
    return '0';
  }

  return {
    status: 'success',
    stats: { activeUsers, totalItems, totalCampaigns, totalQRCodes, totalScans, totalOrganizations },
    formatted: { activeUsers: fmt(activeUsers), totalItems: fmt(totalItems), totalCampaigns: fmt(totalCampaigns), totalQRCodes: fmt(totalQRCodes), totalScans: fmt(totalScans), totalOrganizations: fmt(totalOrganizations) }
  };
}

// ── JSON endpoint (for fetch) ──
const getPublicStats = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=300');
    const data = await gatherStats();
    res.json(data);
  } catch (error) {
    console.error('Public stats error:', error);
    res.json({ status: 'error', stats: {}, formatted: {} });
  }
};

// ── JSONP endpoint (for <script> tag — bypasses ALL CORS issues) ──
const getPublicStatsJS = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    const data = await gatherStats();
    // Outputs: window.__OI_STATS__ = {...}; if(window.__onOIStats) window.__onOIStats(window.__OI_STATS__);
    const js = `window.__OI_STATS__=${JSON.stringify(data)};if(window.__onOIStats)window.__onOIStats(window.__OI_STATS__);`;
    res.send(js);
  } catch (error) {
    console.error('Public stats JS error:', error);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send('window.__OI_STATS__={"status":"error","stats":{},"formatted":{}};if(window.__onOIStats)window.__onOIStats(window.__OI_STATS__);');
  }
};

module.exports = { getPublicStats, getPublicStatsJS };