// ═══════════════════════════════════════════════════════════
// controllers/complianceController.js
// Compliance & Delivery Analytics — org-scoped
// Calculates real compliance metrics from campaign + item data
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate compliance score and detect issues for a campaign.
 * 
 * Compliance checks:
 *   1. Has items (not empty)
 *   2. All items have media
 *   3. QR code exists
 *   4. Items are getting views (delivery working)
 *   5. No stale items (at least some activity in 30 days)
 */
function calculateCampaignCompliance(campaign) {
  const issues = [];
  let score = 100;
  const items = campaign.items || [];
  const totalViews = (campaign.views || 0);
  const qrViews = (campaign.viewsQr || 0);
  const nfcViews = (campaign.viewsNfc || 0);
  const directViews = Math.max(0, totalViews - qrViews - nfcViews);

  // Check 1: Campaign has items
  if (items.length === 0) {
    issues.push({ type: 'EMPTY_CAMPAIGN', severity: 'high', message: 'Campaign has no content items' });
    score -= 30;
  }

  // Check 2: QR code exists
  if (!campaign.qrCodeUrl) {
    issues.push({ type: 'MISSING_QR', severity: 'medium', message: 'No QR code generated' });
    score -= 10;
  }

  // Check 3: Items have proper media
  const itemsWithoutMedia = items.filter(i => !i.mediaUrl || i.mediaUrl === '');
  if (itemsWithoutMedia.length > 0) {
    issues.push({
      type: 'MISSING_MEDIA',
      severity: 'high',
      message: `${itemsWithoutMedia.length} item${itemsWithoutMedia.length > 1 ? 's' : ''} missing media content`,
      affected: itemsWithoutMedia.map(i => i.title),
    });
    score -= Math.min(25, itemsWithoutMedia.length * 10);
  }

  // Check 4: Items without descriptions
  const itemsWithoutDesc = items.filter(i => !i.description || i.description.trim() === '');
  if (itemsWithoutDesc.length > 0 && items.length > 0) {
    issues.push({
      type: 'MISSING_DESCRIPTION',
      severity: 'low',
      message: `${itemsWithoutDesc.length} item${itemsWithoutDesc.length > 1 ? 's' : ''} missing descriptions`,
    });
    score -= Math.min(10, itemsWithoutDesc.length * 3);
  }

  // Check 5: Delivery health — if QR code exists but zero views in 30+ days
  if (campaign.qrCodeUrl && items.length > 0) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (totalViews === 0) {
      issues.push({ type: 'ZERO_DELIVERY', severity: 'medium', message: 'No views recorded — QR code may not be deployed' });
      score -= 15;
    } else {
      // Check for stale campaigns (had views before but none recently)
      const recentItemViews = items.some(i => {
        const updated = new Date(i.updatedAt);
        return updated >= thirtyDaysAgo;
      });
      if (!recentItemViews && totalViews > 10) {
        issues.push({ type: 'STALE_CAMPAIGN', severity: 'low', message: 'No recent activity in last 30 days' });
        score -= 5;
      }
    }
  }

  // Check 6: Password-protected without items being accessible
  if (campaign.passwordProtected && items.length > 0 && totalViews === 0) {
    issues.push({ type: 'PASSWORD_NO_VIEWS', severity: 'low', message: 'Password-protected with zero views — verify password has been shared' });
    score -= 5;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Calculate rates
  const openRate = totalViews > 0 && items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + (i.views || 0), 0) / Math.max(totalViews, 1) * 100)
    : 0;

  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    category: campaign.category || null,
    organizationName: campaign.organization?.name || null,
    organizationId: campaign.organizationId || null,
    passwordProtected: campaign.passwordProtected || false,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,

    // Delivery metrics
    itemCount: items.length,
    totalViews,
    qrViews,
    nfcViews,
    directViews,
    itemViews: items.reduce((sum, i) => sum + (i.views || 0), 0),

    // Compliance
    complianceScore: score,
    complianceLabel: score === 100 ? '100%' : score >= 95 ? `${score}%` : score > 0 ? `${score}%` : 'N/A',
    issues,
    issueCount: issues.length,
    highSeverityCount: issues.filter(i => i.severity === 'high').length,
  };
}


/**
 * GET /compliance/campaigns
 * 
 * Returns per-campaign compliance data with metrics and issues.
 */
const getCampaignCompliance = async (req, res) => {
  try {
    const effectiveUserId = req.effectiveUserId || req.user.userId;
    const { organizationId, status, sort = 'issues' } = req.query;

    // Build where clause
    const where = { userId: effectiveUserId };
    if (organizationId && organizationId !== 'all') {
      where.organizationId = organizationId;
    }

    // Fetch campaigns with items
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, color: true } },
        items: {
          select: {
            id: true,
            title: true,
            type: true,
            mediaUrl: true,
            description: true,
            views: true,
            viewsQr: true,
            viewsNfc: true,
            viewsDirect: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate compliance for each campaign
    let complianceResults = campaigns.map(calculateCampaignCompliance);

    // Sort
    if (sort === 'issues') {
      complianceResults.sort((a, b) => b.issueCount - a.issueCount || a.complianceScore - b.complianceScore);
    } else if (sort === 'score') {
      complianceResults.sort((a, b) => a.complianceScore - b.complianceScore);
    } else if (sort === 'views') {
      complianceResults.sort((a, b) => b.totalViews - a.totalViews);
    } else if (sort === 'newest') {
      complianceResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Filter by status if specified
    if (status === 'compliant') {
      complianceResults = complianceResults.filter(c => c.complianceScore === 100);
    } else if (status === 'issues') {
      complianceResults = complianceResults.filter(c => c.issueCount > 0);
    } else if (status === 'critical') {
      complianceResults = complianceResults.filter(c => c.highSeverityCount > 0);
    }

    res.json({
      status: 'success',
      campaigns: complianceResults,
      total: complianceResults.length,
    });

  } catch (error) {
    console.error('❌ Compliance campaigns error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch compliance data',
      detail: error.message,
    });
  }
};


/**
 * GET /compliance/summary
 * 
 * Returns overall compliance summary stats.
 */
const getComplianceSummary = async (req, res) => {
  try {
    const effectiveUserId = req.effectiveUserId || req.user.userId;

    // Fetch all campaigns with items
    const campaigns = await prisma.campaign.findMany({
      where: { userId: effectiveUserId },
      include: {
        items: {
          select: {
            id: true,
            title: true,
            mediaUrl: true,
            description: true,
            views: true,
            viewsQr: true,
            viewsNfc: true,
            viewsDirect: true,
            updatedAt: true,
          },
        },
      },
    });

    const results = campaigns.map(calculateCampaignCompliance);

    // Calculate summary
    const totalCampaigns = results.length;
    const fullyCompliant = results.filter(c => c.complianceScore === 100).length;
    const withIssues = results.filter(c => c.issueCount > 0).length;
    const criticalIssues = results.filter(c => c.highSeverityCount > 0).length;
    const totalIssues = results.reduce((sum, c) => sum + c.issueCount, 0);
    const totalDelivered = results.reduce((sum, c) => sum + c.totalViews, 0);
    const totalItems = results.reduce((sum, c) => sum + c.itemCount, 0);

    const campaignsWithData = results.filter(c => c.itemCount > 0);
    const avgCompliance = campaignsWithData.length > 0
      ? Math.round(campaignsWithData.reduce((sum, c) => sum + c.complianceScore, 0) / campaignsWithData.length)
      : 0;

    // Issue breakdown
    const allIssues = results.flatMap(c => c.issues);
    const issueBreakdown = {};
    allIssues.forEach(issue => {
      issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
    });

    // Delivery source breakdown
    const totalQr = results.reduce((sum, c) => sum + c.qrViews, 0);
    const totalNfc = results.reduce((sum, c) => sum + c.nfcViews, 0);
    const totalDirect = results.reduce((sum, c) => sum + c.directViews, 0);

    res.json({
      status: 'success',
      summary: {
        totalCampaigns,
        totalItems,
        fullyCompliant,
        withIssues,
        criticalIssues,
        totalIssues,
        avgCompliance,
        totalDelivered,
        deliverySources: {
          qr: totalQr,
          nfc: totalNfc,
          direct: totalDirect,
        },
        issueBreakdown,
        complianceRate: totalCampaigns > 0
          ? Math.round((fullyCompliant / totalCampaigns) * 100)
          : 100,
      },
    });

  } catch (error) {
    console.error('❌ Compliance summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch compliance summary',
      detail: error.message,
    });
  }
};

module.exports = {
  getCampaignCompliance,
  getComplianceSummary,
};