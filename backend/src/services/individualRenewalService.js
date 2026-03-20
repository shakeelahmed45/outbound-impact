// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL (PERSONAL SINGLE USE) RENEWAL SERVICE
//
// The Personal Single Use plan is a $69 payment that lasts 1 year.
// From Year 2 onward, users pay $10/year for continued viewing.
//
// This service runs daily and:
//  - 30 days before expiry: sends a "renewal coming up" email with payment link
//  - 7 days before expiry:  sends an urgent reminder
//  - On expiry day:         sends final notice, marks account as expired
//  - 7 days after expiry:   if still unpaid, suspends access
//
// Required env vars:
//   STRIPE_INDIVIDUAL_RENEWAL_PRICE — price_xxx for the $10/year renewal product
//   FRONTEND_URL
//   RESEND_API_KEY
// ═══════════════════════════════════════════════════════════════

const prisma  = require('../lib/prisma');
const cron    = require('node-cron');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend  = new Resend(process.env.RESEND_API_KEY);
const FRONTEND = process.env.FRONTEND_URL || 'https://outboundimpact.net';

// ─────────────────────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────────────────────
const sendRenewalEmail = async ({ to, name, daysLeft, renewalUrl, expiresAt }) => {
  const isUrgent  = daysLeft <= 7;
  const isExpired = daysLeft <= 0;

  const subject = isExpired
    ? '⚠️ Your Outbound Impact Personal plan has expired'
    : isUrgent
    ? `⏰ ${daysLeft} day${daysLeft === 1 ? '' : 's'} left — Renew your Outbound Impact plan`
    : `📅 Your Outbound Impact plan renews in ${daysLeft} days`;

  const expiryStr = new Date(expiresAt).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,${isExpired ? '#CC3333,#FF6B6B' : isUrgent ? '#FFB020,#FF8C42' : '#800080,#EE82EE'});padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">
      ${isExpired ? '⚠️ Plan Expired' : isUrgent ? '⏰ Renewal Reminder' : '📅 Plan Renewal Coming Up'}
    </h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Outbound Impact — Personal Single Use Plan</p>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#0B1220;font-size:16px;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>

    ${isExpired ? `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Your Personal Single Use plan expired on <strong>${expiryStr}</strong>. Renew now for just <strong>$10/year</strong> to restore viewing access to your QR codes and content.
    </p>
    ` : `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Your Personal Single Use plan ${isUrgent ? `expires in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>` : `is due for renewal on <strong>${expiryStr}</strong>`}.
      Renew for just <strong>$10/year</strong> to keep your content accessible.
    </p>
    `}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;overflow:hidden;margin-bottom:28px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Plan</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;">Personal Single Use</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Renewal Price</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#800080;">USD $10 / year</td></tr>
      <tr><td style="padding:14px 20px;font-size:14px;color:#6B7280;">${isExpired ? 'Expired' : 'Expires'}</td>
          <td style="padding:14px 20px;font-size:14px;font-weight:700;color:${isExpired ? '#CC3333' : '#0B1220'};">${expiryStr}</td></tr>
    </table>

    <div style="text-align:center;margin:32px 0;">
      <a href="${renewalUrl}"
         style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#800080,#EE82EE);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:17px;box-shadow:0 4px 20px rgba(128,0,128,.30);">
        Renew Now — USD $10/year →
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0;">
      Secure checkout via Stripe · Your content is safe while you renew
    </p>
  </div>
  <div style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:13px;color:#6B7280;">Questions? <a href="mailto:support@outboundimpact.org" style="color:#800080;">support@outboundimpact.org</a></p>
  </div>
</div></body></html>`;

  await resend.emails.send({
    from:    'Outbound Impact <noreply@outboundimpact.org>',
    to:      [to],
    replyTo: 'support@outboundimpact.org',
    subject,
    html,
  });
};

// ─────────────────────────────────────────────────────────────
// CREATE RENEWAL PAYMENT LINK
// ─────────────────────────────────────────────────────────────
const createRenewalPaymentLink = async (user) => {
  const renewalPriceId = process.env.STRIPE_INDIVIDUAL_RENEWAL_PRICE;
  if (!renewalPriceId) {
    throw new Error('STRIPE_INDIVIDUAL_RENEWAL_PRICE not configured');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: renewalPriceId, quantity: 1 }],
    mode: 'payment',
    customer_email: user.email,
    success_url: `${FRONTEND}/dashboard?renewed=true`,
    cancel_url:  `${FRONTEND}/dashboard/settings`,
    metadata: {
      userId:    user.id,
      planName:  'INDIVIDUAL',
      priceId:   renewalPriceId,
      type:      'renewal',
    },
  });

  return session.url;
};

// ─────────────────────────────────────────────────────────────
// MAIN RENEWAL CHECK — runs daily
// ─────────────────────────────────────────────────────────────
const runRenewalCheck = async () => {
  console.log('🔄 [Individual Renewal] Starting daily renewal check...');

  const renewalPriceId = process.env.STRIPE_INDIVIDUAL_RENEWAL_PRICE;
  if (!renewalPriceId) {
    console.warn('⚠️ [Individual Renewal] STRIPE_INDIVIDUAL_RENEWAL_PRICE not set — skipping');
    return;
  }

  const now = new Date();

  // Fetch all active INDIVIDUAL users with an expiry date
  const individualUsers = await prisma.user.findMany({
    where: {
      role:                'INDIVIDUAL',
      individualExpiresAt: { not: null },
      subscriptionStatus:  { not: 'suspended' },
    },
    select: {
      id: true, email: true, name: true,
      individualExpiresAt: true, subscriptionStatus: true,
    },
  });

  console.log(`   Found ${individualUsers.length} INDIVIDUAL users to check`);

  for (const user of individualUsers) {
    const expiresAt = new Date(user.individualExpiresAt);
    const diffMs    = expiresAt.getTime() - now.getTime();
    const daysLeft  = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    console.log(`   ${user.email}: ${daysLeft} days until expiry`);

    try {
      // ── 30-day reminder ──────────────────────────────────────
      if (daysLeft === 30) {
        const renewalUrl = await createRenewalPaymentLink(user);
        await sendRenewalEmail({ to: user.email, name: user.name, daysLeft: 30, renewalUrl, expiresAt });
        console.log(`   📧 30-day renewal reminder sent to ${user.email}`);
      }

      // ── 7-day urgent reminder ────────────────────────────────
      else if (daysLeft === 7) {
        const renewalUrl = await createRenewalPaymentLink(user);
        await sendRenewalEmail({ to: user.email, name: user.name, daysLeft: 7, renewalUrl, expiresAt });
        console.log(`   📧 7-day urgent reminder sent to ${user.email}`);
      }

      // ── Expiry day ────────────────────────────────────────────
      else if (daysLeft <= 0 && daysLeft > -7) {
        const renewalUrl = await createRenewalPaymentLink(user);
        await sendRenewalEmail({ to: user.email, name: user.name, daysLeft: 0, renewalUrl, expiresAt });
        console.log(`   📧 Expiry day notice sent to ${user.email}`);
      }

      // ── 7 days after expiry — suspend access ─────────────────
      else if (daysLeft <= -7 && user.subscriptionStatus !== 'suspended') {
        await prisma.user.update({
          where: { id: user.id },
          data:  { subscriptionStatus: 'suspended' },
        });
        console.log(`   🔒 Account suspended (expired ${Math.abs(daysLeft)} days ago): ${user.email}`);

        // Notify admin
        try {
          await resend.emails.send({
            from:    'Outbound Impact <noreply@outboundimpact.org>',
            to:      [process.env.ADMIN_EMAIL || 'shakeel@outboundimpact.org'],
            subject: `🔒 Personal Single Use account suspended: ${user.email}`,
            html:    `<p>${user.name} (${user.email}) has not renewed their Personal Single Use plan ($10/year). Their account has been suspended. They can reactivate by renewing at ${FRONTEND}/dashboard/settings.</p>`,
          });
        } catch (e) { console.error('Admin notify error:', e.message); }
      }

    } catch (err) {
      console.error(`   ❌ Failed to process renewal for ${user.email}:`, err.message);
    }

    // Small delay between users
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('✅ [Individual Renewal] Daily check complete');
};

// ─────────────────────────────────────────────────────────────
// START CRON — daily at 09:05 UTC (5 min after org events)
// ─────────────────────────────────────────────────────────────
const startIndividualRenewalCron = () => {
  cron.schedule('5 9 * * *', async () => {
    await runRenewalCheck().catch(err =>
      console.error('❌ [Individual Renewal] Cron error:', err.message)
    );
  });

  console.log('⏰ Individual renewal cron scheduled (daily at 09:05 UTC)');
};

module.exports = { startIndividualRenewalCron, runRenewalCheck };