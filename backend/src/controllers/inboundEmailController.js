// ═══════════════════════════════════════════════════════════
// INBOUND EMAIL WEBHOOK
//
// Receives replies from external users via Resend Inbound.
//
// HOW IT WORKS:
//   1. When OI sends an external email, the Reply-To is set to:
//      reply+{replyToken}@inbound.outboundimpact.org
//   2. External user hits Reply → their email client sends to that address
//   3. Resend receives it and POSTs a webhook to /api/messages/inbound
//   4. We extract the token from the To address, find the original
//      message, and create a reply Message record in the DB
//   5. The OI user sees the reply in their external inbox
//
// DNS SETUP REQUIRED (one-time, in your domain registrar):
//   MX  inbound.outboundimpact.org  →  feedback-smtp.us-east-1.amazonses.com  10
//   (or whichever MX Resend provides — check Resend dashboard → Inbound)
//
// RESEND SETUP REQUIRED:
//   1. Go to Resend dashboard → Inbound
//   2. Add domain: inbound.outboundimpact.org
//   3. Set webhook URL: https://outbound-impact-production.up.railway.app/api/messages/inbound
//   4. Add env var: INBOUND_EMAIL_DOMAIN=inbound.outboundimpact.org
//      (Already used in messageController.sendExternal)
// ═══════════════════════════════════════════════════════════

const prisma = require('../lib/prisma');

/**
 * POST /api/messages/inbound
 * Called by Resend when an external user replies to an OI email.
 * Public route — no auth (verified by checking replyToken exists in DB).
 */
const handleInbound = async (req, res) => {
  // Acknowledge immediately — Resend requires a fast 200 response
  res.status(200).json({ status: 'ok' });

  try {
    const payload = req.body;

    console.log('📨 Inbound email received');

    // ── Extract key fields from Resend inbound payload ──────────
    // Resend sends: { to, from, subject, text, html, headers, ... }
    const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
    const fromRaw     = payload.from    || '';
    const subject     = payload.subject || '(no subject)';
    const bodyText    = payload.text    || payload.html?.replace(/<[^>]+>/g, '') || '';

    // Extract sender name and email from "Name <email@example.com>" format
    const fromMatch   = fromRaw.match(/^(.*?)\s*<(.+)>$/) || [null, '', fromRaw];
    const fromName    = fromMatch[1]?.trim() || fromRaw;
    const fromEmail   = fromMatch[2]?.trim() || fromRaw;

    console.log(`   From: ${fromEmail} | To: ${toAddresses.join(', ')}`);
    console.log(`   Subject: ${subject}`);

    // ── Find the replyToken in the To address ────────────────────
    // The To address is: reply+{token}@inbound.outboundimpact.org
    let replyToken = null;
    for (const addr of toAddresses) {
      const addrClean  = addr.replace(/.*<(.+)>.*/, '$1').trim();
      const tokenMatch = addrClean.match(/^reply\+([a-f0-9]+)@/i);
      if (tokenMatch) {
        replyToken = tokenMatch[1];
        break;
      }
    }

    if (!replyToken) {
      console.warn('⚠️ Inbound email has no replyToken — ignoring');
      return;
    }

    console.log(`   Reply token: ${replyToken}`);

    // ── Find the original message by replyToken ──────────────────
    const originalMessage = await prisma.message.findUnique({
      where:  { replyToken },
      select: {
        id:          true,
        senderId:    true,
        subject:     true,
        type:        true,
        toEmail:     true,
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!originalMessage) {
      console.warn(`⚠️ No message found for replyToken: ${replyToken}`);
      return;
    }

    console.log(`   Matched original message: ${originalMessage.id} | Sender: ${originalMessage.sender?.email}`);

    // ── Strip quoted reply text ──────────────────────────────────
    // Most email clients include the original message quoted below
    // a separator line. We strip it to keep the inbox clean.
    const cleanBody = stripQuotedReply(bodyText);

    // ── Create the reply Message record ─────────────────────────
    // The reply comes FROM the external user TO the OI user (originalMessage.sender)
    // We store it as type='external' with no senderId (external sender has no OI account)
    // recipientId = the OI user who sent the original message
    const reply = await prisma.message.create({
      data: {
        senderId:    originalMessage.senderId,  // required FK — use original sender (OI user) as placeholder
        recipientId: originalMessage.senderId,  // reply goes to the OI user's inbox
        type:        'external',
        subject:     subject.startsWith('Re:') ? subject : `Re: ${originalMessage.subject}`,
        body:        cleanBody,
        fromName:    fromName || fromEmail,
        fromEmail:   fromEmail,                 // store external sender email for display
        toEmail:     originalMessage.sender?.email || null,
        emailStatus: 'received',
        parentId:    originalMessage.id,        // thread the reply under the original
        read:        false,
      },
    });

    console.log(`✅ Inbound reply created: ${reply.id} | To: ${originalMessage.sender?.email}`);

    // ── Create in-app notification for the OI user ───────────────
    await prisma.notification.create({
      data: {
        userId:   originalMessage.senderId,
        type:     'message',
        category: 'inbox',
        title:    `Reply from ${fromName || fromEmail}`,
        message:  subject,
        metadata: { messageId: reply.id, fromEmail, isInboundReply: true },
      },
    }).catch(err => console.error('⚠️ Inbound notification failed:', err.message));

    console.log(`✅ Notification created for user: ${originalMessage.senderId}`);

  } catch (err) {
    console.error('❌ Inbound email processing error:', err.message);
    // Response already sent — just log the error
  }
};

// ── Helper: strip quoted reply content ──────────────────────────
// Removes everything after common reply separators so only the
// new content is stored.
const stripQuotedReply = (text) => {
  if (!text) return '';

  // Common separators used by Gmail, Outlook, Apple Mail, etc.
  const separators = [
    /\r?\nOn .+wrote:\r?\n/i,          // Gmail: "On Mon, Jan 1 ... wrote:"
    /\r?\n-{3,} ?Original Message ?-{3,}/i,  // Outlook: "--- Original Message ---"
    /\r?\nFrom:.+\r?\nSent:.+\r?\nTo:/is,    // Outlook block header
    /\r?\n_{5,}\r?\n/,                  // Underline separator
    /\r?\n>{1}.+/m,                     // > quoted lines (take first occurrence)
  ];

  let result = text;
  for (const sep of separators) {
    const match = result.search(sep);
    if (match > 50) { // Only strip if there's meaningful content before it
      result = result.substring(0, match).trim();
      break;
    }
  }

  return result.trim() || text.trim();
};

module.exports = { handleInbound };