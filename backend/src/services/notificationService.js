const prisma = require('../lib/prisma');

/**
 * Creates a notification for a user.
 * Called from various controllers when events happen.
 */
const createNotification = async (userId, { type = 'info', category = 'general', title, message, metadata = null }) => {
  try {
    if (!userId || !title || !message) return null;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        category,
        title,
        message,
        metadata: metadata || undefined,
      },
    });

    return notification;
  } catch (error) {
    // Don't let notification failures break the main flow
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

// ═══════════════════════════════════════
// Pre-built notification templates
// ═══════════════════════════════════════

const notifyUpload = async (userId, itemTitle, itemType) => {
  return createNotification(userId, {
    type: 'success',
    category: 'upload',
    title: 'Content Uploaded Successfully',
    message: `Your ${itemType || 'content'} "${itemTitle}" has been uploaded and is ready to share.`,
    metadata: { itemTitle, itemType },
  });
};

const notifyQrScan = async (userId, campaignName, scanCount) => {
  // Only notify at milestones: 1, 10, 25, 50, 100, 250, 500, 1000...
  const milestones = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  if (!milestones.includes(scanCount)) return null;

  return createNotification(userId, {
    type: 'info',
    category: 'view_milestone',
    title: `${scanCount} QR Scans Reached!`,
    message: `Your stream "${campaignName}" has reached ${scanCount} QR scans. Keep sharing to grow your audience!`,
    metadata: { campaignName, scanCount },
  });
};

const notifyViewMilestone = async (userId, itemTitle, viewCount) => {
  const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  if (!milestones.includes(viewCount)) return null;

  return createNotification(userId, {
    type: 'success',
    category: 'view_milestone',
    title: `${viewCount} Views Milestone!`,
    message: `"${itemTitle}" has reached ${viewCount} views. Your content is making an impact!`,
    metadata: { itemTitle, viewCount },
  });
};

const notifyTeamInviteSent = async (userId, email, role) => {
  return createNotification(userId, {
    type: 'info',
    category: 'team',
    title: 'Team Invitation Sent',
    message: `An invitation has been sent to ${email} with the ${role} role.`,
    metadata: { email, role },
  });
};

const notifyTeamMemberJoined = async (userId, memberName, memberEmail) => {
  return createNotification(userId, {
    type: 'success',
    category: 'team',
    title: 'New Team Member Joined',
    message: `${memberName || memberEmail} has accepted the invitation and joined your team.`,
    metadata: { memberName, memberEmail },
  });
};

const notifyStorageWarning = async (userId, percentUsed) => {
  if (percentUsed < 80) return null;

  const level = percentUsed >= 95 ? 'alert' : 'warning';
  const title = percentUsed >= 95 ? 'Storage Almost Full!' : 'Storage Running Low';

  return createNotification(userId, {
    type: level,
    category: 'storage',
    title,
    message: `You've used ${percentUsed}% of your storage. ${percentUsed >= 95 ? 'Upload may fail soon.' : 'Consider upgrading your plan.'} `,
    metadata: { percentUsed },
  });
};

const notifyStreamPublished = async (userId, streamName) => {
  return createNotification(userId, {
    type: 'success',
    category: 'upload',
    title: 'Stream Published',
    message: `Your stream "${streamName}" has been published and QR code generated successfully.`,
    metadata: { streamName },
  });
};

const notifyTeamMemberRemoved = async (userId, memberEmail) => {
  return createNotification(userId, {
    type: 'info',
    category: 'team',
    title: 'Team Member Removed',
    message: `${memberEmail} has been removed from your team.`,
    metadata: { memberEmail },
  });
};

module.exports = {
  createNotification,
  notifyUpload,
  notifyQrScan,
  notifyViewMilestone,
  notifyTeamInviteSent,
  notifyTeamMemberJoined,
  notifyStorageWarning,
  notifyStreamPublished,
  notifyTeamMemberRemoved,
};