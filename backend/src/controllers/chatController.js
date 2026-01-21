const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// USER: Get or Create Conversation
// ═══════════════════════════════════════════════════════════
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    // Try to find existing active conversation
    let conversation = await prisma.chatConversation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // If no active conversation exists, create one
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    res.json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    console.error('Get/Create conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// USER & ADMIN: Send Message
// ═══════════════════════════════════════════════════════════
const sendMessage = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot be empty',
      });
    }

    // Determine if sender is admin or user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user.role === 'ADMIN';
    const senderType = isAdmin ? 'ADMIN' : 'USER';

    // If admin is sending, conversationId must be provided
    if (isAdmin && !conversationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Conversation ID required for admin',
      });
    }

    // For users, get or create their conversation
    let targetConversationId = conversationId;
    
    if (!isAdmin) {
      let conversation = await prisma.chatConversation.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: {
            userId,
            status: 'ACTIVE',
          },
        });
      }

      targetConversationId = conversation.id;
    }

    // Create the message
    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: targetConversationId,
        senderId: userId,
        senderType,
        message: message.trim(),
        isRead: false,
      },
    });

    // Update conversation's lastMessageAt
    await prisma.chatConversation.update({
      where: { id: targetConversationId },
      data: { lastMessageAt: new Date() },
    });

    res.json({
      status: 'success',
      message: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Get All Conversations
// ═══════════════════════════════════════════════════════════
const getAllConversations = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status && (status === 'ACTIVE' || status === 'CLOSED')) {
      where.status = status;
    }

    const conversations = await prisma.chatConversation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get the last message for preview
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Get stats
    const stats = {
      total: await prisma.chatConversation.count(),
      active: await prisma.chatConversation.count({ where: { status: 'ACTIVE' } }),
      closed: await prisma.chatConversation.count({ where: { status: 'CLOSED' } }),
    };

    res.json({
      status: 'success',
      conversations,
      stats,
    });
  } catch (error) {
    console.error('Get all conversations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversations',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Get Single Conversation with All Messages
// ═══════════════════════════════════════════════════════════
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    // Mark admin messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId: id,
        senderType: 'USER',
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Close Conversation
// ═══════════════════════════════════════════════════════════
const closeConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.chatConversation.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    res.json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    console.error('Close conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to close conversation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Reopen Conversation
// ═══════════════════════════════════════════════════════════
const reopenConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.chatConversation.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    res.json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    console.error('Reopen conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reopen conversation',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Get Unread Message Count
// ═══════════════════════════════════════════════════════════
const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.chatMessage.count({
      where: {
        senderType: 'USER',
        isRead: false,
      },
    });

    res.json({
      status: 'success',
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread count',
    });
  }
};

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getAllConversations,
  getConversationById,
  closeConversation,
  reopenConversation,
  getUnreadCount,
};