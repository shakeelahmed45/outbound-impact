const prisma = require('../lib/prisma');
const cron   = require('node-cron');
const { Resend } = require('resend');

const resend   = new Resend(process.env.RESEND_API_KEY);
const FRONTEND = process.env.FRONTEND_URL || 'https://outboundimpact.net';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shakeel@outboundimpact.org';

const PLAN_META = {
  PERSONAL_LIFE: { name: 'Personal Life Events', price: '$15',  period: 'month' },
  ORG_SMALL:     { name: 'Starter',              price: '$49',  period: 'month' },
  ORG_MEDIUM:    { name: 'Growth',               price: '$69',  period: 'month' },
  ORG_SCALE:     { name: 'Pro',                  price: '$99',  period: 'month' },
};

const PLAN_COLORS = {
  PERSONAL_LIFE: '#7B4FD6',
  ORG_SMALL:     '#00C49A',
  ORG_MEDIUM:    '#7B4FD6',
  ORG_SCALE:     '#FF4E4E',
};

const sendRenewalWarningEmail = async ({ to, name, role, renewsOn }) => {
  const plan  = PLAN_META[role];
  const color = PLAN_COLORS[role] || '#7B4FD6';
  if (!plan) return;

  const renewsOnStr = new Date(renewsOn).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,${color},${color}CC);padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">📅 Subscription Renewing in 7 Days</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Outbound Impact — ${plan.name} Plan</p>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#0B1220;font-size:16px;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Your <strong>${plan.name}</strong> subscription will automatically renew on 
      <strong>${renewsOnStr}</strong>. Your card on file will be charged 
      <strong>${plan.price}/${plan.period}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;overflow:hidden;margin-bottom:28px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Plan</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;">${plan.name}</td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Amount</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:${color};">${plan.price} / ${plan.period}</td></tr>
      <tr><td style="padding:14px 20px;font-size:14px;color:#6B7280;">Renewal Date</td>
          <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#0B1220;">${renewsOnStr}</td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      No action is needed — your subscription will renew automatically. 
      If you'd like to update your payment method or cancel before the renewal date, 
      you can do so in your account settings.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${FRONTEND}/dashboard/settings"
         style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,${color},${color}CC);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(0,0,0,.15);">
        Manage Subscription →
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0;">
      Secure payments via Stripe · Cancel anytime from your settings
    </p>
  </div>
  <div style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:13px;color:#6B7280;">Questions? <a href="mailto:support@outboundimpact.org" style="color:${color};">support@outboundimpact.org</a></p>
  </div>
</div></body></html>`;

  await resend.emails.send({
    from:    'Outbound Impact <noreply@outboundimpact.org>',
    to:      [to],
    replyTo: 'support@outboundimpact.org',
    subject: `📅 Your ${plan.name} subscription renews in 7 days — ${plan.price}/${plan.period}`,
    html,
  });
};

const sendAdminRenewalSummary = async (renewingUsers) => {
  if (!renewingUsers.length) return;

  const rows = renewingUsers.map(u => {
    const plan = PLAN_META[u.role]?.name || u.role;
    const renewsOn = new Date(u.currentPeriodEnd).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${u.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6B7280;">${u.email}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;">${plan}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${renewsOn}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f0f2f5;padding:40px 20px;">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <div style="background:linear-gradient(135deg,#0B1220,#1E293B);padding:28px 40px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">📊 Upcoming Renewals — Next 7 Days</h1>
    <p style="color:rgba(255,255,255,.6);margin:6px 0 0;font-size:13px;">Outbound Impact Admin · ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
  <div style="padding:32px 40px;">
    <p style="color:#374151;font-size:14px;margin:0 0 20px;">
      The following <strong>${renewingUsers.length} subscription${renewingUsers.length !== 1 ? 's' : ''}</strong> will automatically renew within the next 7 days. 
      Each user has been sent a reminder email.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Name</th>
          <th style="padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Email</th>
          <th style="padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Plan</th>
          <th style="padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;">Renews On</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #F3F4F6;">
    <a href="${FRONTEND}/admin" style="color:#7B4FD6;font-size:13px;text-decoration:none;">View Admin Dashboard →</a>
  </div>
</div></body></html>`;

  await resend.emails.send({
    from:    'Outbound Impact <noreply@outboundimpact.org>',
    to:      [ADMIN_EMAIL],
    replyTo: 'support@outboundimpact.org',
    subject: `📊 ${renewingUsers.length} subscription${renewingUsers.length !== 1 ? 's' : ''} renewing in the next 7 days`,
    html,
  });
};

// ─────────────────────────────────────────────────────────────
const runMonthlyRenewalCheck = async () => {
  console.log('🔄 [Monthly Renewal Reminder] Starting daily check...');

  try {
    const now     = new Date();
    // Window: 6–8 days out (range to survive missed/late cron runs)
    const minDate = new Date(now.getTime() + 6  * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 8  * 24 * 60 * 60 * 1000);

    const upcomingRenewals = await prisma.user.findMany({
      where: {
        role:               { in: ['PERSONAL_LIFE', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_SCALE'] },
        subscriptionStatus: { in: ['active', 'trialing'] },
        currentPeriodEnd:   { gte: minDate, lte: maxDate },
      },
      select: {
        id: true, email: true, name: true, role: true, currentPeriodEnd: true,
      },
    });

    console.log(`   Found ${upcomingRenewals.length} subscription(s) renewing in ~7 days`);

    const notifiedUsers = [];

    for (const user of upcomingRenewals) {
      try {
        await sendRenewalWarningEmail({
          to:       user.email,
          name:     user.name,
          role:     user.role,
          renewsOn: user.currentPeriodEnd,
        });
        console.log(`   📧 7-day renewal warning sent to ${user.email} (${PLAN_META[user.role]?.name})`);
        notifiedUsers.push(user);
        await new Promise(r => setTimeout(r, 400)); // rate limit Resend
      } catch (err) {
        console.error(`   ❌ Failed to notify ${user.email}:`, err.message);
      }
    }

    if (notifiedUsers.length > 0) {
      try {
        await sendAdminRenewalSummary(notifiedUsers);
        console.log(`   📧 Admin renewal summary sent to ${ADMIN_EMAIL}`);
      } catch (err) {
        console.error('   ❌ Failed to send admin renewal summary:', err.message);
      }
    }

    console.log('✅ [Monthly Renewal Reminder] Daily check complete');
  } catch (err) {
    console.error('❌ [Monthly Renewal Reminder] Check failed:', err.message);
    throw err;
  }
};

const startMonthlyRenewalReminderCron = () => {
  cron.schedule('10 9 * * *', async () => {
    await runMonthlyRenewalCheck().catch(err =>
      console.error('❌ [Monthly Renewal Reminder] Cron error:', err.message)
    );
  });
  console.log('⏰ Monthly renewal reminder cron scheduled (daily at 09:10 UTC)');
};

module.exports = { startMonthlyRenewalReminderCron, runMonthlyRenewalCheck };