// ═══════════════════════════════════════════════════════════
// controllers/messageController.js
// Internal team messaging + External email via Resend
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logAudit, AUDIT_ACTIONS } = require('../helpers/auditLogger');

// ═══════════════════════════════════════════════
// Email notification for new messages
// ═══════════════════════════════════════════════
const sendMessageNotificationEmail = async (recipientEmail, recipientName, senderName, subject, bodyPreview) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured — skipping message notification email');
      return { success: false };
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const preview = bodyPreview.length > 200 ? bodyPreview.substring(0, 200) + '...' : bodyPreview;

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [recipientEmail],
      replyTo: 'support@outboundimpact.org',
      subject: `New message from ${senderName}: ${subject}`,
      headers: {
        'List-Unsubscribe': '<mailto:support@outboundimpact.org?subject=unsubscribe>',
        'X-Entity-Ref-ID': `msg-${Date.now()}`,
      },
      text: `Hi ${recipientName || 'there'},\n\n${senderName} sent you a message:\n\nSubject: ${subject}\n\n${preview}\n\nView & reply in your inbox: https://outboundimpact.com/dashboard/inbox\n\n— Outbound Impact`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 30px 24px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700;">New Message</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">You have a new message on Outbound Impact</p>
            </div>
            <div style="background: #ffffff; padding: 30px 24px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Hi ${recipientName || 'there'},</p>
              <p style="margin: 0 0 20px; color: #333; font-size: 15px;">
                <strong>${senderName}</strong> sent you a message:
              </p>
              
              <div style="background: #f8f5ff; border-left: 4px solid #9333EA; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 0 0 24px;">
                <p style="margin: 0 0 6px; font-weight: 600; color: #333; font-size: 15px;">${subject}</p>
                <p style="margin: 0; color: #555; font-size: 14px; white-space: pre-wrap;">${preview}</p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://outboundimpact.com/dashboard/inbox" 
                   style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View &amp; Reply in Inbox
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
              <p style="margin: 0;">Sent via <a href="https://outboundimpact.com" style="color: #800080; text-decoration: none;">Outbound Impact</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Message notification email error:', error);
      return { success: false, error };
    }

    console.log(`✅ Message notification email sent to ${recipientEmail}`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('⚠️ Message notification email failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * GET /messages
 * Fetch messages for the current user (received + sent).
 * Query: type=internal|external, folder=inbox|sent, page, limit
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      type = 'all',
      folder = 'inbox',
      page = 1,
      limit = 50,
      search,
    } = req.query;

    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = ((parseInt(page) || 1) - 1) * take;

    // Build where clause
    const where = { archived: false };

    if (folder === 'inbox') {
      where.recipientId = userId;
    } else if (folder === 'sent') {
      where.senderId = userId;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { toEmail: { contains: search, mode: 'insensitive' } },
        { sender: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          type: true,
          subject: true,
          body: true,
          read: true,
          starred: true,
          toEmail: true,
          fromName: true,
          emailStatus: true,
          parentId: true,
          createdAt: true,
          sender: {
            select: { id: true, name: true, email: true, profilePicture: true },
          },
          recipient: {
            select: { id: true, name: true, email: true, profilePicture: true },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({
      status: 'success',
      messages,
      total,
      page: parseInt(page) || 1,
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch messages', detail: error.message });
  }
};

/**
 * GET /messages/unread-count
 * Quick count of unread messages for badge display.
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [internalCount, externalCount] = await Promise.all([
      prisma.message.count({
        where: { recipientId: userId, read: false, archived: false, type: 'internal' },
      }),
      prisma.message.count({
        where: { recipientId: userId, read: false, archived: false, type: 'external' },
      }),
    ]);

    res.json({
      status: 'success',
      unread: { internal: internalCount, external: externalCount, total: internalCount + externalCount },
    });
  } catch (error) {
    console.error('❌ Unread count error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get unread count' });
  }
};

/**
 * POST /messages/internal
 * Send an internal message to a team member.
 */
const sendInternal = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { to, subject, body, parentId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ status: 'error', message: 'To, subject, and body are required' });
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });

    // Resolve recipient
    let recipientId = null;
    let recipientName = null;

    if (to === 'all') {
      // Send to all team members — we'll create one message per member
      const effectiveUserId = req.effectiveUserId || senderId;
      const teamMembers = await prisma.teamMember.findMany({
        where: { userId: effectiveUserId, memberUserId: { not: null }, status: 'ACCEPTED' },
        select: { memberUserId: true, email: true },
      });

      // Also include the owner if sender is a team member
      const allRecipients = [];
      if (senderId !== effectiveUserId) {
        allRecipients.push(effectiveUserId); // Add owner
      }
      teamMembers.forEach(tm => {
        if (tm.memberUserId && tm.memberUserId !== senderId) {
          allRecipients.push(tm.memberUserId);
        }
      });

      if (allRecipients.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No team members found to send to' });
      }

      const messages = await Promise.all(
        allRecipients.map(rid =>
          prisma.message.create({
            data: {
              senderId,
              recipientId: rid,
              type: 'internal',
              subject,
              body,
              fromName: sender?.name || 'Team Member',
              parentId: parentId || null,
            },
          })
        )
      );

      // Create notifications for each recipient
      await Promise.all(
        allRecipients.map(rid =>
          prisma.notification.create({
            data: {
              userId: rid,
              type: 'message',
              category: 'inbox',
              title: `New message from ${sender?.name || 'Team Member'}`,
              message: subject,
              metadata: { messageId: messages[0]?.id, senderId },
            },
          }).catch(() => {}) // Non-blocking
        )
      );

      // Send email notifications to each recipient
      const recipientUsers = await prisma.user.findMany({
        where: { id: { in: allRecipients } },
        select: { email: true, name: true },
      });
      recipientUsers.forEach(ru => {
        sendMessageNotificationEmail(ru.email, ru.name, sender?.name || 'Team Member', subject, body)
          .then(result => {
            if (result.success) {
              console.log('✅ Bulk message notification email sent to:', ru.email);
            } else {
              console.error('❌ Bulk message notification email failed for:', ru.email, result.error);
            }
          })
          .catch(err => console.error('❌ Bulk message notification email error:', err.message));
      });

      return res.status(201).json({
        status: 'success',
        message: `Message sent to ${allRecipients.length} team member${allRecipients.length > 1 ? 's' : ''}`,
        count: allRecipients.length,
      });
    }

    // Single recipient — resolve by email or userId
    if (to.includes('@')) {
      const recipient = await prisma.user.findUnique({
        where: { email: to },
        select: { id: true, name: true },
      });
      if (recipient) {
        recipientId = recipient.id;
        recipientName = recipient.name;
      }
    } else {
      recipientId = to;
      const recipient = await prisma.user.findUnique({
        where: { id: to },
        select: { name: true },
      });
      recipientName = recipient?.name;
    }

    if (!recipientId) {
      return res.status(404).json({ status: 'error', message: 'Recipient not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId,
        type: 'internal',
        subject,
        body,
        fromName: sender?.name || 'Team Member',
        parentId: parentId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, profilePicture: true } },
        recipient: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
    });

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'message',
        category: 'inbox',
        title: `New message from ${sender?.name || 'Team Member'}`,
        message: subject,
        metadata: { messageId: message.id, senderId },
      },
    }).catch(() => {}); // Non-blocking

    // Send email notification to recipient
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, name: true },
    });
    if (recipientUser?.email) {
      sendMessageNotificationEmail(recipientUser.email, recipientUser.name, sender?.name || 'Team Member', subject, body)
        .then(result => {
          if (result.success) {
            console.log('✅ Internal message notification email sent to:', recipientUser.email);
          } else {
            console.error('❌ Internal message notification email failed for:', recipientUser.email, result.error);
          }
        })
        .catch(err => console.error('❌ Internal message notification email error:', err.message));
    } else {
      console.warn('⚠️ No email found for recipient:', recipientId);
    }

    res.status(201).json({ status: 'success', message: 'Message sent', data: message });

  } catch (error) {
    console.error('❌ Send internal error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send message', detail: error.message });
  }
};

/**
 * POST /messages/external
 * Send an external email via Resend.
 */
const sendExternal = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { to, subject, body, parentId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ status: 'error', message: 'To, subject, and body are required' });
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });

    // Check if recipient is also a platform user (for recipientId linking)
    const recipientUser = await prisma.user.findUnique({
      where: { email: to },
      select: { id: true, name: true, email: true },
    });

    // Create message record first
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId: recipientUser?.id || null,
        type: 'external',
        subject,
        body,
        toEmail: to,
        fromName: sender?.name || 'Outbound Impact User',
        emailStatus: 'pending',
        parentId: parentId || null,
      },
    });

    // ✅ If recipient is a platform user, create in-app notification
    if (recipientUser?.id) {
      await prisma.notification.create({
        data: {
          userId: recipientUser.id,
          type: 'message',
          category: 'inbox',
          title: `New message from ${sender?.name || 'Someone'}`,
          message: subject,
          metadata: { messageId: message.id, senderId, isExternal: true },
        },
      }).catch(err => console.error('❌ External notification creation failed:', err.message));

      // ✅ Also send email notification to the platform user
      sendMessageNotificationEmail(recipientUser.email, recipientUser.name, sender?.name || 'Outbound Impact User', subject, body)
        .then(result => {
          if (result.success) {
            console.log('✅ External message notification email sent to platform user:', recipientUser.email);
          } else {
            console.error('❌ External message notification email failed:', recipientUser.email, result.error);
          }
        })
        .catch(err => console.error('❌ External message notification email error:', err.message));
    }

    // Try sending via Resend
    let emailSent = false;
    let emailId = null;

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
          from: `${sender?.name || 'Outbound Impact'} <noreply@outboundimpact.org>`,
          to: [to],
          replyTo: sender?.email || 'support@outboundimpact.org',
          subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">Message from ${sender?.name || 'Outbound Impact'}</h2>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                <h3 style="color: #333; margin-top: 0;">${subject}</h3>
                <div style="color: #555; line-height: 1.6; white-space: pre-wrap;">${body}</div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px;">
                  Sent via <a href="https://outboundimpact.com" style="color: #800080;">Outbound Impact</a>
                  ${sender?.email ? ` • Reply to: ${sender.email}` : ''}
                </p>
              </div>
            </div>
          `,
        });

        if (error) {
          console.error('❌ Resend error:', error);
        } else {
          emailSent = true;
          emailId = data?.id;
        }
      }
    } catch (emailErr) {
      console.error('⚠️ Email send failed (non-blocking):', emailErr.message);
    }

    // Update message with email status
    await prisma.message.update({
      where: { id: message.id },
      data: {
        emailStatus: emailSent ? 'sent' : 'failed',
        emailId: emailId || null,
      },
    });

    const updatedMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
    });

    res.status(201).json({
      status: 'success',
      message: emailSent ? 'Email sent successfully' : 'Message saved (email delivery failed)',
      mode: emailSent ? 'live' : 'saved',
      data: updatedMessage,
    });

  } catch (error) {
    console.error('❌ Send external error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send email', detail: error.message });
  }
};

/**
 * PUT /messages/:id/read
 * Mark a message as read.
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message || message.recipientId !== userId) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    await prisma.message.update({
      where: { id },
      data: { read: true },
    });

    res.json({ status: 'success', message: 'Marked as read' });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark as read' });
  }
};

/**
 * PUT /messages/:id/star
 * Toggle star on a message.
 */
const toggleStar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message || (message.recipientId !== userId && message.senderId !== userId)) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { starred: !message.starred },
    });

    res.json({ status: 'success', starred: updated.starred });
  } catch (error) {
    console.error('❌ Toggle star error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle star' });
  }
};

/**
 * DELETE /messages/:id
 * Archive (soft-delete) a message.
 */
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message || (message.recipientId !== userId && message.senderId !== userId)) {
      return res.status(404).json({ status: 'error', message: 'Message not found' });
    }

    await prisma.message.update({
      where: { id },
      data: { archived: true },
    });

    res.json({ status: 'success', message: 'Message deleted' });
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete message' });
  }
};

/**
 * GET /messages/team-recipients
 * Get list of team members the user can message.
 */
const getTeamRecipients = async (req, res) => {
  try {
    const userId = req.user.userId;
    const effectiveUserId = req.effectiveUserId || userId;

    // Get all accepted team members for this account
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: effectiveUserId, memberUserId: { not: null }, status: 'ACCEPTED' },
      select: {
        memberUserId: true,
        email: true,
        role: true,
        memberUser: {
          select: { id: true, name: true, email: true, profilePicture: true },
        },
      },
    });

    // Build recipients list
    const recipients = [];

    // If current user is a team member, include the account owner
    if (userId !== effectiveUserId) {
      const owner = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, name: true, email: true, profilePicture: true },
      });
      if (owner) {
        recipients.push({ ...owner, role: 'Owner' });
      }
    }

    // Add team members (excluding self)
    teamMembers.forEach(tm => {
      if (tm.memberUser && tm.memberUserId !== userId) {
        recipients.push({
          id: tm.memberUser.id,
          name: tm.memberUser.name,
          email: tm.memberUser.email,
          profilePicture: tm.memberUser.profilePicture,
          role: tm.role,
        });
      }
    });

    res.json({ status: 'success', recipients });
  } catch (error) {
    console.error('❌ Get recipients error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get team recipients' });
  }
};

module.exports = {
  getMessages,
  getUnreadCount,
  sendInternal,
  sendExternal,
  markAsRead,
  toggleStar,
  deleteMessage,
  getTeamRecipients,
};