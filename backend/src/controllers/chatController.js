const prisma = require('../lib/prisma');
const { sendChatNotificationToAdmin, sendChatReplyToUser } = require('../services/emailService');

// ═══════════════════════════════════════════════════════════
// USER: Get or Create Conversation
// ═══════════════════════════════════════════════════════════
const getOrCreateConversation = async (req, res) => {
  try {
    // CRITICAL FIX: Use actual logged-in user ID, not effectiveUserId
    const userId = req.user.userId;

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
            name: true,
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
              name: true,
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
    // CRITICAL FIX: Use actual logged-in user ID, not effectiveUserId
    const actualUserId = req.user.userId;
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot be empty',
      });
    }

    // Get actual user info (not effective user)
    const user = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: { 
        role: true,
        email: true,
        name: true,
      },
    });

    const isAdmin = user.role === 'ADMIN';
    const senderType = isAdmin ? 'ADMIN' : 'USER';

    console.log('💬 Send Message Debug:', {
      actualUserId,
      isAdmin,
      conversationId,
      senderType,
    });

    // ═══════════════════════════════════════════════════════════
    // DETERMINE TARGET CONVERSATION
    // ═══════════════════════════════════════════════════════════
    
    let targetConversationId = conversationId;
    let targetUserEmail = null;
    let targetUserName = null;
    
    if (isAdmin) {
      // ADMIN SENDING MESSAGE
      if (!conversationId) {
        return res.status(400).json({
          status: 'error',
          message: 'Conversation ID required for admin',
        });
      }

      // CRITICAL: Verify conversation exists and get the ACTUAL user
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found',
        });
      }

      targetConversationId = conversation.id;
      targetUserEmail = conversation.user.email;
      targetUserName = conversation.user.name;

      console.log('✅ Admin sending to:', {
        conversationId: targetConversationId,
        targetUser: targetUserName,
        targetEmail: targetUserEmail,
      });

    } else {
      // USER SENDING MESSAGE
      // Get or create their conversation
      let conversation = await prisma.chatConversation.findFirst({
        where: {
          userId: actualUserId,
          status: 'ACTIVE',
        },
      });

      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: {
            userId: actualUserId,
            status: 'ACTIVE',
          },
        });
      }

      targetConversationId = conversation.id;
      console.log('✅ User sending from conversation:', targetConversationId);
    }

    // ═══════════════════════════════════════════════════════════
    // CREATE MESSAGE
    // ═══════════════════════════════════════════════════════════
    
    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: targetConversationId,
        senderId: actualUserId, // CRITICAL: Use actual user ID
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

    console.log('✅ Message created:', {
      messageId: newMessage.id,
      conversationId: targetConversationId,
      senderType,
    });

    // ═══════════════════════════════════════════════════════════
    // SEND EMAIL NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════
    
    if (!isAdmin) {
      // USER sent message → Notify ADMIN
      console.log('📧 Sending chat notification to admin...');
      sendChatNotificationToAdmin(
        {
          userName: user.name,
          userEmail: user.email,
        },
        message.trim()
      ).catch(err => console.error('Failed to send admin notification:', err));
    } else {
      // ADMIN sent message → Notify USER
      if (targetUserEmail && targetUserName) {
        console.log('📧 Sending reply notification to:', targetUserEmail);
        sendChatReplyToUser(
          targetUserEmail,
          targetUserName,
          message.trim()
        ).catch(err => console.error('Failed to send user notification:', err));
      }
    }

    res.json({
      status: 'success',
      message: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message,
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
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get the last message for preview
        },
        _count: {
          select: {
            messages: {
              where: {
                senderType: 'USER',
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Get stats
    const stats = {
      total: await prisma.chatConversation.count(),
      active: await prisma.chatConversation.count({ where: { status: 'ACTIVE' } }),
      closed: await prisma.chatConversation.count({ where: { status: 'CLOSED' } }),
      unread: await prisma.chatMessage.count({
        where: {
          senderType: 'USER',
          isRead: false,
        },
      }),
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
            name: true,
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

    // Mark user messages as read
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

// ═══════════════════════════════════════════════════════════
// USER: Start New Conversation (Close current and create new)
// ═══════════════════════════════════════════════════════════
const startNewConversation = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Close all existing active conversations
    await prisma.chatConversation.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: { status: 'CLOSED' },
    });

    // Create new conversation
    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        messages: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.json({
      status: 'success',
      conversation,
      message: 'New conversation started',
    });
  } catch (error) {
    console.error('Start new conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start new conversation',
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
  startNewConversation,
};