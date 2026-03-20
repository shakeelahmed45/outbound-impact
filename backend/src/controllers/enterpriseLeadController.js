const prisma  = require('../lib/prisma');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const resend  = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  || 'shakeel@outboundimpact.org';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://outboundimpact.net';

// ─── helpers ──────────────────────────────────────────────────

const formatBytes = (gb) => {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb} GB`;
};

// ══════════════════════════════════════════════════════════════
// POST /api/enterprise-leads  (public — no auth)
// Prospect fills in contact form on Plans page
// ══════════════════════════════════════════════════════════════
const submitLead = async (req, res) => {
  try {
    const { name, email, company, phone, teamSize, storageNeeds, message, signupPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({ status: 'error', message: 'Name and email are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: 'error', message: 'Please enter a valid email address' });
    }

    // Hash password if provided (from signup form localStorage data)
    let signupPasswordHash = null;
    if (signupPassword) {
      const bcrypt = require('bcryptjs');
      signupPasswordHash = await bcrypt.hash(signupPassword, 10);
    }

    // Save lead
    const lead = await prisma.enterpriseLead.create({
      data: {
        name:               name.trim(),
        email:              email.toLowerCase().trim(),
        company:            company?.trim() || null,
        phone:              phone?.trim()   || null,
        teamSize:           teamSize        || null,
        storageNeeds:       storageNeeds    || null,
        message:            message?.trim() || null,
        signupPasswordHash: signupPasswordHash,
        status:             'new',
      },
    });

    // ── Email to admin ───────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      resend.emails.send({
        from:    'Outbound Impact <noreply@outboundimpact.org>',
        to:      [ADMIN_EMAIL],
        replyTo: email,
        subject: `🏢 New Enterprise Lead: ${name} — ${company || 'No company'}`,
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,#00C49A,#7B4FD6);padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🏢 New Enterprise Lead</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Someone is interested in the Enterprise plan</p>
  </div>
  <div style="padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Name</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;">${name}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Email</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;">${email}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Company</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#0B1220;">${company || '—'}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Phone</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#0B1220;">${phone || '—'}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Team Size</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#0B1220;">${teamSize || '—'}</td></tr>
      <tr><td style="padding:14px 20px;font-size:14px;color:#6B7280;">Storage Needs</td>
          <td style="padding:14px 20px;font-size:14px;color:#0B1220;">${storageNeeds || '—'}</td></tr>
    </table>
    ${message ? `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #FFB020;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-weight:600;color:#92400E;font-size:13px;">MESSAGE</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${message}</p>
    </div>` : ''}
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/admin-panel/enterprise-leads/${lead.id}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00C49A,#7B4FD6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        View Lead &amp; Send Checkout Link →
      </a>
    </div>
  </div>
</div></body></html>`,
      }).catch(err => console.error('Lead admin email failed:', err.message));

      // ── Confirmation to prospect ─────────────────────────
      resend.emails.send({
        from:    'Outbound Impact <noreply@outboundimpact.org>',
        to:      [email],
        replyTo: 'support@outboundimpact.org',
        subject: "We've received your Enterprise enquiry — Outbound Impact",
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,#00C49A,#7B4FD6);padding:32px 40px;text-align:center;">
    <img src="https://outboundimpact.net/android-chrome-192x192.png" width="56" height="56" style="border-radius:12px;display:block;margin:0 auto 14px;">
    <h1 style="color:#fff;margin:0;font-size:22px;">We'll be in touch soon!</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Enterprise Enquiry Received</p>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#0B1220;font-size:16px;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Thank you for your interest in <strong>Outbound Impact Enterprise</strong>. We've received your enquiry and our team will review your requirements and be in touch within <strong>1 business day</strong>.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px;">
      We'll send you a personalised subscription link configured specifically for your organisation's needs — storage, team members, and features all tailored to you.
    </p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #00C49A;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#065F46;">📧 In the meantime, feel free to reply to this email with any questions.</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/plans" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00C49A,#7B4FD6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">View Plans →</a>
    </div>
  </div>
  <div style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:13px;color:#6B7280;"><strong style="color:#7B4FD6;">Outbound Impact</strong> — Share Content. Track Analytics. Grow Your Reach.</p>
  </div>
</div></body></html>`,
      }).catch(err => console.error('Lead confirmation email failed:', err.message));
    }

    res.json({ status: 'success', message: 'Enquiry submitted successfully', leadId: lead.id });
  } catch (error) {
    console.error('submitLead error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit enquiry. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/enterprise-leads  (admin only)
// ══════════════════════════════════════════════════════════════
const getLeads = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status && status !== 'all' ? { status } : {};

    const [leads, total] = await Promise.all([
      prisma.enterpriseLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:  (Number(page) - 1) * Number(limit),
        take:  Number(limit),
      }),
      prisma.enterpriseLead.count({ where }),
    ]);

    // Status counts for the tab bar
    const counts = await prisma.enterpriseLead.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const statusCounts = counts.reduce((acc, c) => ({ ...acc, [c.status]: c._count.id }), {});

    res.json({ status: 'success', leads, total, statusCounts });
  } catch (error) {
    console.error('getLeads error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leads' });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/enterprise-leads/:id  (admin only)
// ══════════════════════════════════════════════════════════════
const getLeadById = async (req, res) => {
  try {
    const lead = await prisma.enterpriseLead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ status: 'error', message: 'Lead not found' });
    res.json({ status: 'success', lead });
  } catch (error) {
    console.error('getLeadById error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch lead' });
  }
};

// ══════════════════════════════════════════════════════════════
// PATCH /api/enterprise-leads/:id  (admin only)
// Update status / admin notes
// ══════════════════════════════════════════════════════════════
const updateLead = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const data = {};
    if (status)     data.status     = status;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const lead = await prisma.enterpriseLead.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ status: 'success', lead });
  } catch (error) {
    console.error('updateLead error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update lead' });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /api/enterprise-leads/:id/send-checkout  (admin only)
// Admin configures storage/members/price → creates Stripe checkout
// session → emails direct checkout link to prospect
// Prospect already set name+password via the normal signup form
// ══════════════════════════════════════════════════════════════
const sendCheckoutLink = async (req, res) => {
  try {
    const { storageGB, audienceSize, monthlyPrice, notes } = req.body;
    const lead = await prisma.enterpriseLead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ status: 'error', message: 'Lead not found' });

    if (!storageGB || !monthlyPrice) {
      return res.status(400).json({ status: 'error', message: 'Storage and monthly price are required' });
    }

    const audienceLabel = audienceSize === -1 || audienceSize === '-1'
      ? 'Unlimited audience members'
      : `${Number(audienceSize).toLocaleString()} audience members`;

    // ── Create Stripe product + price for this prospect ───────
    const product = await stripe.products.create({
      name:        `Enterprise Plan — ${formatBytes(storageGB)} / ${audienceLabel}`,
      description: `Custom Enterprise plan for ${lead.company || lead.name}. ${notes || ''}`.trim(),
      metadata:    { leadId: lead.id, storageGB: String(storageGB), audienceSize: String(audienceSize), company: lead.company || '' },
    });

    const price = await stripe.prices.create({
      product:     product.id,
      unit_amount: Math.round(Number(monthlyPrice) * 100),
      currency:    'usd',
      recurring:   { interval: 'month' },
      metadata:    { leadId: lead.id, storageGB: String(storageGB), audienceSize: String(audienceSize) },
    });

    // ── Create Stripe Checkout session ────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           [{ price: price.id, quantity: 1 }],
      mode:                 'subscription',
      customer_email:       lead.email,
      success_url:          `${FRONTEND_URL}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${FRONTEND_URL}/plans`,
      metadata: {
        planName:     'ORG_ENTERPRISE',
        leadId:       lead.id,
        storageGB:    String(storageGB),
        audienceSize: String(audienceSize),
      },
      subscription_data: {
        metadata: {
          planName:     'ORG_ENTERPRISE',
          leadId:       lead.id,
          storageGB:    String(storageGB),
          audienceSize: String(audienceSize),
        },
      },
    });

    // ── Save plan config + checkout URL on the lead ───────────
    await prisma.enterpriseLead.update({
      where: { id: lead.id },
      data: {
        status:         'contacted',
        checkoutUrl:    session.url,
        checkoutSentAt: new Date(),
        storageGB:      Number(storageGB),
        audienceSize:   Number(audienceSize) || null,
        monthlyPrice:   Number(monthlyPrice),
        adminNotes:     notes || lead.adminNotes,
      },
    });

    // ── Email checkout link to prospect ───────────────────────
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from:    'Outbound Impact <noreply@outboundimpact.org>',
        to:      [lead.email],
        replyTo: 'support@outboundimpact.org',
        subject: `🚀 Your Outbound Impact Enterprise Plan is Ready — ${lead.company || lead.name}`,
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,#00C49A,#7B4FD6);padding:32px 40px;text-align:center;">
    <img src="https://outboundimpact.net/android-chrome-192x192.png" width="56" height="56" style="border-radius:12px;display:block;margin:0 auto 14px;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Your Enterprise Plan is Ready! 🚀</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Custom configured for ${lead.company || lead.name}</p>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#0B1220;font-size:16px;margin:0 0 20px;">Hi <strong>${lead.name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      We've prepared a custom Enterprise plan for your organisation. Here's what's included:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;overflow:hidden;margin-bottom:28px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Storage</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#00C49A;">${formatBytes(storageGB)}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Audience Members</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#7B4FD6;">${audienceLabel}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Monthly Price</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;">USD $${Number(monthlyPrice).toFixed(2)}/month</td></tr>
      <tr><td colspan="2" style="padding:14px 20px;font-size:13px;color:#6B7280;">
        ✅ Cohorts &amp; Segmentation &nbsp;·&nbsp; ✅ Workflows &nbsp;·&nbsp; ✅ Audit Logs &nbsp;·&nbsp; ✅ Compliance &nbsp;·&nbsp; ✅ Unlimited team users &nbsp;·&nbsp; ✅ Dedicated support
      </td></tr>
    </table>
    ${notes ? `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #FFB020;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${notes}</p>
    </div>` : ''}
    <div style="text-align:center;margin:32px 0;">
      <a href="${session.url}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#00C49A,#7B4FD6);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:17px;box-shadow:0 4px 20px rgba(0,196,154,.30);">
        Subscribe Now — USD $${Number(monthlyPrice).toFixed(2)}/mo →
      </a>
    </div>
    <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0;">
      Secure checkout via Stripe · Cancel anytime
    </p>
  </div>
  <div style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:13px;color:#6B7280;">Questions? <a href="mailto:support@outboundimpact.org" style="color:#7B4FD6;">support@outboundimpact.org</a></p>
  </div>
</div></body></html>`,
      });
    }

    console.log(`✅ Enterprise checkout link sent to ${lead.email}`);
    res.json({ status: 'success', message: `Checkout link sent to ${lead.email}`, checkoutUrl: session.url });
  } catch (error) {
    console.error('sendCheckoutLink error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to send checkout link' });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /api/enterprise-leads/by-token/:token  (public)
// Frontend signup page fetches lead info to pre-fill the form
// ══════════════════════════════════════════════════════════════
const getLeadByToken = async (req, res) => {
  try {
    const lead = await prisma.enterpriseLead.findUnique({
      where: { checkoutToken: req.params.token },
      select: {
        id: true, name: true, email: true, company: true,
        storageGB: true, audienceSize: true, monthlyPrice: true,
        status: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired link. Please contact support.' });
    }

    if (lead.status === 'converted') {
      return res.status(410).json({ status: 'error', message: 'This link has already been used. Please sign in.' });
    }

    res.json({ status: 'success', lead });
  } catch (error) {
    console.error('getLeadByToken error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch lead info' });
  }
};

// ══════════════════════════════════════════════════════════════
// DELETE /api/enterprise-leads/:id  (admin only)
// ══════════════════════════════════════════════════════════════
const deleteLead = async (req, res) => {
  try {
    await prisma.enterpriseLead.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Lead deleted' });
  } catch (error) {
    console.error('deleteLead error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete lead' });
  }
};

module.exports = { submitLead, getLeads, getLeadById, updateLead, sendCheckoutLink, getLeadByToken, deleteLead };