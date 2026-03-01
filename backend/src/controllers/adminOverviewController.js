const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createNotification } = require('../services/notificationService');
const { notifyAdminCampaignSent } = require('../services/adminNotificationService');

const PLAN_CONFIG = {
  INDIVIDUAL:      { label: 'Individual',          color: 'bg-slate-500',  maxItems: 3,   maxTeam: 1, price: 0 },
  ORG_SMALL:       { label: 'Small Organization',  color: 'bg-blue-500',   maxItems: 5,   maxTeam: 3, price: 0 },
  ORG_MEDIUM:      { label: 'Medium Organization', color: 'bg-purple-500', maxItems: -1,  maxTeam: -1, price: 29 },
  ORG_ENTERPRISE:  { label: 'Enterprise',          color: 'bg-green-500',  maxItems: -1,  maxTeam: -1, price: 99 },
};

// ═══════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════
const getOverview = async (req, res) => {
  try {
    const planCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { role: { in: ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'] } },
      _count: { role: true }
    });
    const planBreakdown = Object.keys(PLAN_CONFIG).map(role => {
      const found = planCounts.find(p => p.role === role);
      const cfg = PLAN_CONFIG[role];
      return { plan: cfg.label, role, customers: found ? found._count.role : 0, color: cfg.color, price: cfg.price };
    });
    const recentCustomers = await prisma.user.findMany({
      where: { role: { in: ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'] } },
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { items: true, campaigns: true } } }
    });
    const topPerformers = await prisma.user.findMany({
      where: { role: { in: ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'] } },
      select: { id: true, name: true, email: true, role: true, items: { select: { views: true } }, _count: { select: { items: true, campaigns: true } } },
      take: 100
    });
    const ranked = topPerformers.map(u => ({
      id: u.id, name: u.name, email: u.email, plan: PLAN_CONFIG[u.role]?.label || u.role,
      totalViews: u.items.reduce((sum, i) => sum + (i.views || 0), 0), items: u._count.items, campaigns: u._count.campaigns
    })).sort((a, b) => b.totalViews - a.totalViews).slice(0, 5);

    res.json({
      status: 'success', planBreakdown,
      recentCustomers: recentCustomers.map(u => ({ id: u.id, name: u.name, email: u.email, plan: PLAN_CONFIG[u.role]?.label || u.role, items: u._count.items, campaigns: u._count.campaigns, joinedAt: u.createdAt })),
      topPerformers: ranked
    });
  } catch (error) { console.error('Overview error:', error); res.status(500).json({ status: 'error', message: 'Failed to fetch overview' }); }
};

// ═══════════════════════════════════════════════════════════
// REVENUE
// ═══════════════════════════════════════════════════════════
const getRevenue = async (req, res) => {
  try {
    const planCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { role: { in: ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'] }, subscriptionStatus: 'active' },
      _count: { role: true }
    });
    const revenueByPlan = Object.keys(PLAN_CONFIG).map(role => {
      const found = planCounts.find(p => p.role === role);
      const count = found ? found._count.role : 0;
      const cfg = PLAN_CONFIG[role];
      return { plan: cfg.label, role, activeCustomers: count, pricePerMonth: cfg.price, mrr: count * cfg.price, color: cfg.color };
    });
    const totalMRR = revenueByPlan.reduce((sum, p) => sum + p.mrr, 0);
    const totalActive = revenueByPlan.reduce((sum, p) => sum + p.activeCustomers, 0);
    res.json({ status: 'success', totalMRR, totalActiveCustomers: totalActive, annualRunRate: totalMRR * 12, avgRevenuePerCustomer: totalActive > 0 ? (totalMRR / totalActive).toFixed(2) : '0.00', revenueByPlan });
  } catch (error) { console.error('Revenue error:', error); res.status(500).json({ status: 'error', message: 'Failed to fetch revenue' }); }
};

// ═══════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════
const getOpportunities = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM'] }, status: { not: 'suspended' } },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, subscriptionStatus: true, createdAt: true, _count: { select: { items: true, teamMembers: true } } }
    });
    const upgradeOpportunities = users.map(u => {
      const cfg = PLAN_CONFIG[u.role];
      if (!cfg) return null;
      const itemCount = u._count.items, teamCount = u._count.teamMembers;
      const maxItems = cfg.maxItems, maxTeam = cfg.maxTeam;
      const itemUsage = maxItems > 0 ? (itemCount / maxItems) : 0;
      const teamUsage = maxTeam > 0 ? (teamCount / maxTeam) : 0;
      const score = Math.round(Math.max(itemUsage, teamUsage) * 100);
      if (score < 70) return null;
      const nextPlan = u.role === 'INDIVIDUAL' ? 'Small Organization' : u.role === 'ORG_SMALL' ? 'Medium Organization' : 'Enterprise';
      return { id: u.id, name: u.name, email: u.email, currentPlan: cfg.label, items: maxItems > 0 ? `${itemCount}/${maxItems}` : `${itemCount}/∞`, team: maxTeam > 0 ? `${teamCount}/${maxTeam}` : `${teamCount}/∞`, score, upgradeTo: nextPlan, createdAt: u.createdAt };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const churnRisks = await prisma.user.findMany({
      where: { role: { in: ['ORG_MEDIUM', 'ORG_ENTERPRISE'] }, subscriptionStatus: 'active', OR: [{ lastLoginAt: { lt: fourteenDaysAgo } }, { lastLoginAt: null }] },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, items: { select: { views: true } } }
    });
    const churnRiskList = churnRisks.map(u => {
      const cfg = PLAN_CONFIG[u.role];
      const totalViews = u.items.reduce((sum, i) => sum + (i.views || 0), 0);
      const days = u.lastLoginAt ? Math.floor((Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return { id: u.id, name: u.name, email: u.email, plan: cfg?.label || u.role, mrr: cfg?.price || 0, lastActivity: u.lastLoginAt ? `${days} days ago` : 'Never', totalViews, risk: days > 30 ? 'HIGH' : 'MEDIUM' };
    }).sort((a, b) => (a.risk === 'HIGH' ? 0 : 1) - (b.risk === 'HIGH' ? 0 : 1));

    res.json({ status: 'success', upgradeOpportunities, churnRisks: churnRiskList });
  } catch (error) { console.error('Opportunities error:', error); res.status(500).json({ status: 'error', message: 'Failed to fetch opportunities' }); }
};

// ═══════════════════════════════════════════════════════════
// GEOGRAPHY — Real country data from Analytics table
// ═══════════════════════════════════════════════════════════
const getGeography = async (req, res) => {
  try {
    // Aggregate scan totals from Items
    const scanTotals = await prisma.item.aggregate({
      _sum: { views: true, viewsQr: true, viewsNfc: true, viewsDirect: true }
    });

    // Country breakdown from Analytics table (real IP-based data)
    const countryData = await prisma.analytics.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 20
    });

    // Source breakdown from Analytics table
    const sourceData = await prisma.analytics.groupBy({
      by: ['source'],
      _count: { source: true }
    });

    // Device breakdown
    const deviceData = await prisma.analytics.groupBy({
      by: ['device'],
      _count: { device: true }
    });

    // Top items by views
    const topItems = await prisma.item.findMany({
      orderBy: { views: 'desc' }, take: 20,
      select: { id: true, title: true, views: true, viewsQr: true, viewsNfc: true, viewsDirect: true, user: { select: { name: true, email: true, role: true } } }
    });

    const totalAnalyticsRecords = countryData.reduce((sum, c) => sum + c._count.country, 0);

    res.json({
      status: 'success',
      totalScans: scanTotals._sum.views || 0,
      totalQrScans: scanTotals._sum.viewsQr || 0,
      totalNfcScans: scanTotals._sum.viewsNfc || 0,
      totalDirectScans: scanTotals._sum.viewsDirect || 0,
      countries: countryData.map(c => ({
        country: c.country || 'Unknown',
        views: c._count.country,
        percentage: totalAnalyticsRecords > 0 ? ((c._count.country / totalAnalyticsRecords) * 100).toFixed(1) : '0'
      })),
      sources: sourceData.map(s => ({ source: s.source || 'direct', count: s._count.source })),
      devices: deviceData.map(d => ({ device: d.device || 'Desktop', count: d._count.device })),
      topItems: topItems.map(i => ({
        id: i.id, title: i.title, views: i.views, qrScans: i.viewsQr, nfcScans: i.viewsNfc, directScans: i.viewsDirect,
        owner: i.user.name, ownerEmail: i.user.email, plan: PLAN_CONFIG[i.user.role]?.label || i.user.role
      }))
    });
  } catch (error) { console.error('Geography error:', error); res.status(500).json({ status: 'error', message: 'Failed to fetch geography' }); }
};

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS — Send real notifications + emails to users
// ═══════════════════════════════════════════════════════════
const sendCampaign = async (req, res) => {
  try {
    const { name, message, type, targetPlans } = req.body;
    if (!name || !message) return res.status(400).json({ status: 'error', message: 'Name and message are required' });

    // Map plan labels to role enums
    const planToRole = { 'Individual': 'INDIVIDUAL', 'Small Organization': 'ORG_SMALL', 'Medium Organization': 'ORG_MEDIUM', 'Enterprise': 'ORG_ENTERPRISE' };
    const roleFilter = (targetPlans || []).map(p => planToRole[p]).filter(Boolean);
    if (roleFilter.length === 0) roleFilter.push('INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE');

    // Get target users
    const users = await prisma.user.findMany({
      where: { role: { in: roleFilter }, status: { not: 'suspended' } },
      select: { id: true, name: true, email: true }
    });

    let notificationsSent = 0;
    let emailsSent = 0;
    const errors = [];

    // Send in-app notifications
    if (type === 'In-App Notification' || type === 'Both') {
      for (const user of users) {
        try {
          await createNotification(user.id, {
            type: 'info', category: 'campaign',
            title: name,
            message: message,
            metadata: { campaignName: name }
          });
          notificationsSent++;
        } catch (e) { errors.push(`Notification to ${user.email}: ${e.message}`); }
      }
    }

    // Send emails
    if (type === 'Email Alert' || type === 'Both') {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        for (const user of users) {
          try {
            await resend.emails.send({
              from: 'Outbound Impact <noreply@outboundimpact.org>',
              to: [user.email],
              replyTo: 'support@outboundimpact.org',
              subject: name,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Outbound Impact</h1>
                  </div>
                  <div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0;">
                    <p>Hi ${user.name},</p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${process.env.FRONTEND_URL || 'https://outboundimpact.com'}/dashboard" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                  </div>
                  <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>Outbound Impact — Share your story with the world</p>
                  </div>
                </div>
              `
            });
            emailsSent++;
          } catch (e) { errors.push(`Email to ${user.email}: ${e.message}`); }
        }
      } catch (e) {
        errors.push(`Email service error: ${e.message}`);
      }
    }

    // ─── Store campaign log for history ───
    const adminId = req.user.userId;
    try {
      await createNotification(adminId, {
        type: 'success',
        category: 'campaign_log',
        title: name,
        message: message,
        metadata: {
          campaignName: name,
          type,
          targetPlans: targetPlans || [],
          totalTargeted: users.length,
          notificationsSent,
          emailsSent,
          errors: errors.length,
          sentAt: new Date().toISOString()
        }
      });
    } catch (e) { console.error('Failed to save campaign log:', e.message); }

    // ─── Notify admins about campaign sent ───
    await notifyAdminCampaignSent(name, users.length, notificationsSent, emailsSent);

    res.json({
      status: 'success',
      campaign: name,
      totalTargeted: users.length,
      notificationsSent,
      emailsSent,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });
  } catch (error) { console.error('Campaign error:', error); res.status(500).json({ status: 'error', message: 'Failed to send campaign' }); }
};

// ═══════════════════════════════════════════════════════════
// DISCOUNT CODES — Real Stripe Coupons
// ═══════════════════════════════════════════════════════════
const getDiscountCodes = async (req, res) => {
  try {
    const coupons = await stripe.coupons.list({ limit: 50 });
    // Also get promotion codes for each coupon
    const codes = [];
    for (const coupon of coupons.data) {
      const promoCodes = await stripe.promotionCodes.list({ coupon: coupon.id, limit: 10 });
      if (promoCodes.data.length > 0) {
        promoCodes.data.forEach(pc => {
          codes.push({
            id: pc.id,
            code: pc.code,
            couponId: coupon.id,
            discountType: coupon.percent_off ? 'percentage' : 'fixed_amount',
            discountValue: coupon.percent_off || (coupon.amount_off / 100),
            status: pc.active ? 'active' : 'inactive',
            maxUses: pc.max_redemptions,
            currentUses: pc.times_redeemed,
            validUntil: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
            metadata: coupon.metadata || {},
            applicablePlans: coupon.metadata?.applicablePlans ? coupon.metadata.applicablePlans.split(',') : [],
            resellerName: coupon.metadata?.resellerName || null,
            commissionType: coupon.metadata?.commissionType || null,
            commissionValue: coupon.metadata?.commissionValue ? parseFloat(coupon.metadata.commissionValue) : 0,
            createdAt: new Date(coupon.created * 1000).toISOString()
          });
        });
      } else {
        // Coupon without promo code — show with coupon ID as code
        codes.push({
          id: coupon.id,
          code: coupon.id,
          couponId: coupon.id,
          discountType: coupon.percent_off ? 'percentage' : 'fixed_amount',
          discountValue: coupon.percent_off || (coupon.amount_off / 100),
          status: coupon.valid ? 'active' : 'inactive',
          maxUses: coupon.max_redemptions,
          currentUses: coupon.times_redeemed,
          validUntil: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
          metadata: coupon.metadata || {},
          applicablePlans: coupon.metadata?.applicablePlans ? coupon.metadata.applicablePlans.split(',') : [],
          resellerName: coupon.metadata?.resellerName || null,
          commissionType: coupon.metadata?.commissionType || null,
          commissionValue: coupon.metadata?.commissionValue ? parseFloat(coupon.metadata.commissionValue) : 0,
          createdAt: new Date(coupon.created * 1000).toISOString()
        });
      }
    }
    res.json(codes);
  } catch (error) { console.error('Get discount codes error:', error); res.json([]); }
};

const createDiscountCode = async (req, res) => {
  try {
    const { code, discountType, discountValue, validUntil, maxUses, applicablePlans, resellerName, commissionType, commissionValue } = req.body;
    if (!code || !discountValue) return res.status(400).json({ status: 'error', message: 'Code and discount value required' });

    // Create Stripe coupon
    const couponParams = {
      metadata: {
        applicablePlans: (applicablePlans || []).join(','),
        resellerName: resellerName || '',
        commissionType: commissionType || '',
        commissionValue: (commissionValue || '').toString()
      }
    };
    if (discountType === 'percentage') {
      couponParams.percent_off = parseFloat(discountValue);
    } else {
      couponParams.amount_off = Math.round(parseFloat(discountValue) * 100);
      couponParams.currency = 'usd';
    }
    if (maxUses) couponParams.max_redemptions = parseInt(maxUses);
    if (validUntil) couponParams.redeem_by = Math.floor(new Date(validUntil).getTime() / 1000);

    const coupon = await stripe.coupons.create(couponParams);

    // Create promotion code (the actual code customers type in)
    const promoParams = {
      coupon: coupon.id,
      code: code.toUpperCase()
    };
    if (maxUses) promoParams.max_redemptions = parseInt(maxUses);
    if (validUntil) promoParams.expires_at = Math.floor(new Date(validUntil).getTime() / 1000);

    const promoCode = await stripe.promotionCodes.create(promoParams);

    res.json({
      id: promoCode.id,
      code: promoCode.code,
      couponId: coupon.id,
      discountType,
      discountValue: parseFloat(discountValue),
      status: 'active',
      maxUses: maxUses ? parseInt(maxUses) : null,
      currentUses: 0,
      validUntil: validUntil || null,
      applicablePlans: applicablePlans || [],
      resellerName: resellerName || null,
      commissionType: commissionType || null,
      commissionValue: commissionValue ? parseFloat(commissionValue) : 0
    });
  } catch (error) {
    console.error('Create discount code error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create discount code' });
  }
};

const deleteDiscountCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    // Try deactivating promotion code first, then delete coupon
    try {
      await stripe.promotionCodes.update(codeId, { active: false });
    } catch (e) {
      // If it's a coupon ID, delete the coupon
      await stripe.coupons.del(codeId);
    }
    res.json({ status: 'success', message: 'Discount code deleted' });
  } catch (error) {
    console.error('Delete discount code error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete discount code' });
  }
};

// ═══════════════════════════════════════════════════════════
// REVENUE HISTORY — Last 12 months from Stripe + 3-month forecast
// ═══════════════════════════════════════════════════════════
const getRevenueHistory = async (req, res) => {
  try {
    const now = new Date();
    const months = [];

    // Fetch last 12 months of paid invoices from Stripe
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = monthStart.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months.push({ label, start: monthStart, end: monthEnd, revenue: 0, payments: 0, isActual: true });
    }

    // Batch fetch — get all invoices from 12 months ago to now
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    let allInvoices = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        created: { gte: Math.floor(twelveMonthsAgo.getTime() / 1000) },
        status: 'paid',
        limit: 100
      };
      if (startingAfter) params.starting_after = startingAfter;

      const batch = await stripe.invoices.list(params);
      allInvoices = allInvoices.concat(batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
    }

    // Bucket invoices into months
    allInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.created * 1000);
      const monthIdx = months.findIndex(m =>
        invoiceDate >= m.start && invoiceDate <= m.end
      );
      if (monthIdx !== -1) {
        months[monthIdx].revenue += invoice.amount_paid / 100;
        months[monthIdx].payments += 1;
      }
    });

    // Calculate growth trend for forecast (average monthly growth over last 6 months)
    const recentMonths = months.slice(-6).map(m => m.revenue);
    let avgGrowthRate = 0;
    let growthCount = 0;
    for (let i = 1; i < recentMonths.length; i++) {
      if (recentMonths[i - 1] > 0) {
        avgGrowthRate += (recentMonths[i] - recentMonths[i - 1]) / recentMonths[i - 1];
        growthCount++;
      }
    }
    avgGrowthRate = growthCount > 0 ? avgGrowthRate / growthCount : 0;

    // Generate 3-month forecast
    let lastRevenue = months[months.length - 1].revenue;

    // If no invoice history but we have active subscriptions, use current MRR as forecast base
    if (lastRevenue === 0) {
      try {
        const activeSubs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
        let currentMRR = 0;
        activeSubs.data.forEach(sub => {
          sub.items.data.forEach(item => {
            if (item.price?.unit_amount && item.price?.recurring?.interval === 'month') {
              currentMRR += item.price.unit_amount / 100;
            } else if (item.price?.unit_amount && item.price?.recurring?.interval === 'year') {
              currentMRR += (item.price.unit_amount / 100) / 12;
            }
          });
        });
        if (currentMRR > 0) lastRevenue = currentMRR;
      } catch (e) { /* Stripe sub lookup failed, keep lastRevenue as 0 */ }
    }

    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = forecastDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const projected = Math.round(lastRevenue * Math.pow(1 + avgGrowthRate, i));
      forecast.push({ label, revenue: projected, isActual: false });
    }

    // Also get new user signups per month for correlation
    const userGrowth = [];
    for (const m of months) {
      const count = await prisma.user.count({
        where: { createdAt: { gte: m.start, lte: m.end } }
      });
      userGrowth.push({ label: m.label, newUsers: count });
    }

    res.json({
      status: 'success',
      history: months.map(m => ({
        label: m.label,
        revenue: parseFloat(m.revenue.toFixed(2)),
        payments: m.payments,
        isActual: true
      })),
      forecast: forecast.map(f => ({
        label: f.label,
        revenue: f.revenue,
        isActual: false
      })),
      userGrowth,
      avgMonthlyGrowthRate: parseFloat((avgGrowthRate * 100).toFixed(1)),
      totalInvoicesFetched: allInvoices.length
    });
  } catch (error) {
    console.error('Revenue history error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch revenue history' });
  }
};

// ═══════════════════════════════════════════════════════════
// CAMPAIGN HISTORY — Fetches past campaigns from notification logs
// ═══════════════════════════════════════════════════════════
const getCampaignHistory = async (req, res) => {
  try {
    const logs = await prisma.notification.findMany({
      where: { category: 'campaign_log' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        message: true,
        metadata: true,
        createdAt: true,
      }
    });

    const campaigns = logs.map(log => {
      const meta = log.metadata || {};
      return {
        id: log.id,
        name: log.title,
        message: log.message,
        type: meta.type || 'Both',
        targetPlans: meta.targetPlans || [],
        totalTargeted: meta.totalTargeted || 0,
        notificationsSent: meta.notificationsSent || 0,
        emailsSent: meta.emailsSent || 0,
        errors: meta.errors || 0,
        sentAt: meta.sentAt || log.createdAt,
        status: 'completed'
      };
    });

    res.json({ status: 'success', campaigns });
  } catch (error) {
    console.error('Campaign history error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch campaign history' });
  }
};

module.exports = {
  getOverview, getRevenue, getOpportunities, getGeography,
  sendCampaign, getCampaignHistory, getDiscountCodes, createDiscountCode, deleteDiscountCode,
  getRevenueHistory
};