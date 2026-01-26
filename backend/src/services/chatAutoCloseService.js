const prisma = require('../lib/prisma');
const cron = require('node-cron');

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

async function closeInactiveChats() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - INACTIVITY_TIMEOUT);

    const inactiveConversations = await prisma.chatConversation.findMany({
      where: {
        status: {
          in: ['ACTIVE'],
        },
        lastMessageAt: {
          lt: fifteenMinutesAgo,
        },
      },
    });

    if (inactiveConversations.length === 0) {
      console.log('[Auto-Close] No inactive chats to close');
      return;
    }

    const result = await prisma.chatConversation.updateMany({
      where: {
        id: {
          in: inactiveConversations.map((c) => c.id),
        },
      },
      data: {
        status: 'CLOSED',
      },
    });

    console.log(`[Auto-Close] Closed ${result.count} inactive conversations`);

    for (const conversation of inactiveConversations) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: 'system',
          senderType: 'ADMIN',
          message: 'This chat has been automatically closed due to inactivity. You can start a new chat anytime!',
          isRead: false,
          isAiGenerated: true,
        },
      });
    }
  } catch (error) {
    console.error('[Auto-Close] Error closing inactive chats:', error);
  }
}

function startAutoCloseJob() {
  cron.schedule('*/5 * * * *', () => {
    console.log('[Auto-Close] Running auto-close check...');
    closeInactiveChats();
  });

  console.log('[Auto-Close] Cron job started - checking every 5 minutes');
}

async function manualCloseInactiveChats() {
  return await closeInactiveChats();
}

module.exports = {
  startAutoCloseJob,
  manualCloseInactiveChats,
  INACTIVITY_TIMEOUT,
};