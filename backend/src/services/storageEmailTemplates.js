const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND = {
  gradient: 'linear-gradient(135deg, #00C49A 0%, #7B4FD6 100%)',
  teal: '#00C49A',
  violet: '#7B4FD6',
  amber: '#FFB020',
  coral: '#FF4E4E',
  navy: '#0B1220',
};

// ──────────────────────────────────────────────────────────────
// STORAGE WARNING EMAIL  (sent daily while user is at ≥80%)
// ──────────────────────────────────────────────────────────────
const sendStorageWarningEmail = async ({ email, name, percentUsed, storageUsedFormatted, storageLimitFormatted, currentPlan }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured — skipping storage warning email');
      return { success: false };
    }

    const isCritical = percentUsed >= 95;
    const subject = isCritical
      ? `🚨 Storage Critical (${percentUsed}% used) — Action Required`
      : `⚠️ Storage Warning: You've used ${percentUsed}% of your storage`;

    const urgencyColor   = isCritical ? '#FF4E4E' : '#FFB020';
    const urgencyBg      = isCritical ? '#FFF1F1' : '#FFFBEB';
    const urgencyBorder  = isCritical ? '#FECACA' : '#FDE68A';
    const urgencyLabel   = isCritical ? '🚨 Critical — uploads may fail soon' : '⚠️ Running low on storage';

    const dashboardUrl = `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/settings`;
    const upgradeUrl   = `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/dashboard`;

    const barWidth  = Math.min(percentUsed, 100);
    const barColor  = isCritical ? '#FF4E4E' : '#FFB020';

    const { data, error } = await resend.emails.send({
      from:    'Outbound Impact <noreply@outboundimpact.org>',
      to:      [email],
      replyTo: 'support@outboundimpact.org',
      subject,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f0f2f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;">

    <!-- HEADER -->
    <tr><td style="background:${BRAND.gradient};padding:40px 40px 30px;text-align:center;">
      <img src="https://outboundimpact.net/android-chrome-192x192.png" alt="Outbound Impact" width="56" height="56"
           style="display:block;margin:0 auto 16px;border-radius:12px;" />
      <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Storage Alert</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Outbound Impact</p>
    </td></tr>

    <!-- BODY -->
    <tr><td style="padding:40px;">

      <p style="color:#0B1220;font-size:16px;margin:0 0 24px;">Hi <strong>${name || 'there'}</strong>,</p>

      <!-- URGENCY BADGE -->
      <div style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-left:4px solid ${urgencyColor};border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0;font-size:15px;font-weight:600;color:${urgencyColor};">${urgencyLabel}</p>
        <p style="margin:6px 0 0;color:#555;font-size:14px;">
          Your <strong>${currentPlan || 'current'}</strong> plan storage is ${percentUsed}% full.
        </p>
      </div>

      <!-- USAGE BAR -->
      <div style="margin-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;font-weight:600;color:#0B1220;">Storage Used</td>
            <td align="right" style="font-size:14px;font-weight:700;color:${barColor};">${percentUsed}%</td>
          </tr>
        </table>
        <div style="background:#E5E7EB;border-radius:999px;height:12px;margin-top:8px;overflow:hidden;">
          <div style="background:${barColor};width:${barWidth}%;height:100%;border-radius:999px;"></div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
          <tr>
            <td style="font-size:13px;color:#6B7280;">${storageUsedFormatted} used</td>
            <td align="right" style="font-size:13px;color:#6B7280;">${storageLimitFormatted} total</td>
          </tr>
        </table>
      </div>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px;">
        When your storage is full, new uploads will be blocked. Take action now to keep your content flowing smoothly.
      </p>

      <!-- ACTION BUTTONS -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="padding-right:8px;" width="50%">
            <a href="${upgradeUrl}"
               style="display:block;text-align:center;background:${BRAND.gradient};color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700;font-size:15px;">
              ⬆️ Upgrade Plan
            </a>
          </td>
          <td style="padding-left:8px;" width="50%">
            <a href="${dashboardUrl}#storage"
               style="display:block;text-align:center;background:#F9FAFB;border:2px solid #7B4FD6;color:#7B4FD6;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700;font-size:15px;">
              💾 Add Storage
            </a>
          </td>
        </tr>
      </table>

      <!-- WHY -->
      <div style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#4338CA;">💡 Why upgrade?</p>
        <ul style="margin:0;padding-left:18px;color:#555;font-size:14px;line-height:2;">
          <li>More storage for videos, images and audio</li>
          <li>Unlock higher-tier plan features</li>
          <li>Keep sharing content without interruptions</li>
        </ul>
      </div>

      <p style="color:#9CA3AF;font-size:13px;margin:0;border-top:1px solid #F3F4F6;padding-top:20px;">
        You'll receive this reminder daily until your storage is below 80% or you upgrade. 
        Questions? Reply to this email or visit <a href="https://outboundimpact.org" style="color:#7B4FD6;">outboundimpact.org</a>.
      </p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:14px;color:#6B7280;">
        <strong style="color:#7B4FD6;">Outbound Impact</strong> — Share Content. Track Analytics. Grow Your Reach.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#D1D5DB;">© ${new Date().getFullYear()} Outbound Impact. All rights reserved.</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`,
    });

    if (error) {
      console.error('❌ Storage warning email failed:', error);
      return { success: false, error: error.message };
    }
    console.log(`✅ Storage warning email sent → ${email} (${percentUsed}% used)`);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('❌ sendStorageWarningEmail error:', err.message);
    return { success: false, error: err.message };
  }
};

// ──────────────────────────────────────────────────────────────
// STORAGE CONFIRMATION EMAIL  (upgrade OR storage add-on)
// ──────────────────────────────────────────────────────────────
const sendStorageConfirmationEmail = async ({
  email, name, type, // 'upgrade' | 'addon'
  newPlan, addedGB, newStorageLimitFormatted,
  amountCharged, currency,
}) => {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const isUpgrade = type === 'upgrade';
    const subject   = isUpgrade
      ? `🎉 Plan Upgraded — More storage unlocked!`
      : `✅ Storage Added — ${addedGB}GB added to your account!`;

    const headline  = isUpgrade ? `You're on the ${newPlan} plan!` : `${addedGB}GB Storage Added!`;
    const bodyIntro = isUpgrade
      ? `Your plan has been successfully upgraded to <strong>${newPlan}</strong>. You now have more storage and access to additional features.`
      : `<strong>${addedGB}GB</strong> of storage has been successfully added to your account. Your uploads will continue without interruption.`;

    const dashUrl = `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/dashboard`;

    const { data, error } = await resend.emails.send({
      from:    'Outbound Impact <noreply@outboundimpact.org>',
      to:      [email],
      replyTo: 'support@outboundimpact.org',
      subject,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f0f2f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;">

    <!-- HEADER -->
    <tr><td style="background:${BRAND.gradient};padding:40px 40px 30px;text-align:center;">
      <img src="https://outboundimpact.net/android-chrome-192x192.png" alt="Outbound Impact" width="56" height="56"
           style="display:block;margin:0 auto 16px;border-radius:12px;" />
      <div style="background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:32px;">${isUpgrade ? '🚀' : '💾'}</span>
      </div>
      <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">${headline}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Outbound Impact</p>
    </td></tr>

    <!-- BODY -->
    <tr><td style="padding:40px;">

      <p style="color:#0B1220;font-size:16px;margin:0 0 20px;">Hi <strong>${name || 'there'}</strong>,</p>

      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #00C49A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-weight:600;color:#065F46;font-size:15px;">✅ ${isUpgrade ? 'Plan upgraded successfully!' : 'Storage added successfully!'}</p>
      </div>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${bodyIntro}</p>

      <!-- DETAILS TABLE -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;margin-bottom:28px;overflow:hidden;">
        ${isUpgrade ? `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">New Plan</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;text-align:right;">${newPlan}</td>
        </tr>` : `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Storage Added</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#0B1220;text-align:right;">${addedGB}GB</td>
        </tr>`}
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;color:#6B7280;">Total Storage</td>
          <td style="padding:14px 20px;border-bottom:1px solid #E0E7FF;font-size:14px;font-weight:700;color:#00C49A;text-align:right;">${newStorageLimitFormatted}</td>
        </tr>
        ${amountCharged ? `
        <tr>
          <td style="padding:14px 20px;font-size:14px;color:#6B7280;">Amount Charged</td>
          <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#0B1220;text-align:right;">${currency || 'AUD'} $${amountCharged}</td>
        </tr>` : ''}
      </table>

      <div style="text-align:center;margin:28px 0;">
        <a href="${dashUrl}" style="display:inline-block;padding:14px 36px;background:${BRAND.gradient};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;">
          Go to Dashboard →
        </a>
      </div>

      <p style="color:#9CA3AF;font-size:13px;margin:0;border-top:1px solid #F3F4F6;padding-top:20px;">
        Thank you for being an Outbound Impact customer. If you have any questions about your account, 
        reply to this email or contact us at <a href="mailto:support@outboundimpact.org" style="color:#7B4FD6;">support@outboundimpact.org</a>.
      </p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:14px;color:#6B7280;">
        <strong style="color:#7B4FD6;">Outbound Impact</strong> — Share Content. Track Analytics. Grow Your Reach.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#D1D5DB;">© ${new Date().getFullYear()} Outbound Impact. All rights reserved.</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`,
    });

    if (error) {
      console.error('❌ Storage confirmation email failed:', error);
      return { success: false, error: error.message };
    }
    console.log(`✅ Storage confirmation email sent → ${email} (${type})`);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('❌ sendStorageConfirmationEmail error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendStorageWarningEmail, sendStorageConfirmationEmail };