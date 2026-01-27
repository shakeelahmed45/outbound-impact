const prisma = require('../lib/prisma');
const { sendChatNotificationToAdmin, sendChatReplyToUser } = require('../services/emailService');
const { handleUserMessageWithAi, saveAnalytics, recordAiFeedback } = require('../services/aiChatService');
const { uploadChatAttachment, getMessageAttachments } = require('../services/chatFileService');

// ═══════════════════════════════════════════════════════════
// USER: Get or Create Conversation
// ═══════════════════════════════════════════════════════════
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.userId;

    let conversation = await prisma.chatConversation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: true,
          },
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

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          userId,
          status: 'ACTIVE',
          isAiHandling: true,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true,
            },
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
// 🆕 NEW: Get Messages (for polling)
// ═══════════════════════════════════════════════════════════
const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { after } = req.query;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    const whereClause = {
      conversationId: conversationId,
    };

    if (after) {
      whereClause.createdAt = {
        gt: new Date(after),
      };
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        attachments: true,
      },
    });

    res.json({
      status: 'success',
      messages,
      isAiHandling: conversation.isAiHandling,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get messages',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// USER & ADMIN: Send Message (with AI and File Support)
// ═══════════════════════════════════════════════════════════
const sendMessage = async (req, res) => {
  try {
    const actualUserId = req.user.userId;
    const { message, conversationId } = req.body;
    const files = req.files || [];

    if (!message || !message.trim()) {
      if (files.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Message or file required',
        });
      }
    }

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

    console.log('💬 Send Message:', {
      actualUserId,
      isAdmin,
      hasFiles: files.length > 0,
      fileCount: files.length,
    });

    let targetConversationId = conversationId;
    let targetUserEmail = null;
    let targetUserName = null;
    let conversation = null;
    
    if (isAdmin) {
      if (!conversationId) {
        return res.status(400).json({
          status: 'error',
          message: 'Conversation ID required for admin',
        });
      }

      conversation = await prisma.chatConversation.findUnique({
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

      if (conversation.isAiHandling) {
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { 
            isAiHandling: false,
            escalatedToHumanAt: new Date(),
            escalationReason: 'Admin replied',
          },
        });
      }

    } else {
      conversation = await prisma.chatConversation.findFirst({
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
            isAiHandling: true,
          },
        });
      }

      targetConversationId = conversation.id;
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: targetConversationId,
        senderId: actualUserId,
        senderType,
        message: message?.trim() || '[File attachment]',
        isRead: false,
        hasAttachments: files.length > 0,
        isAiGenerated: false,
      },
    });

    const uploadedAttachments = [];
    
    if (files.length > 0) {
      console.log(`📎 Uploading ${files.length} file(s)...`);
      
      for (const file of files) {
        const uploadResult = await uploadChatAttachment(file, newMessage.id, actualUserId);
        
        if (uploadResult.success) {
          uploadedAttachments.push(uploadResult.attachment);
        } else {
          console.error('File upload failed:', uploadResult.error);
        }
      }
      
      console.log(`✅ ${uploadedAttachments.length} file(s) uploaded`);
    }

    await prisma.chatConversation.update({
      where: { id: targetConversationId },
      data: { lastMessageAt: new Date() },
    });

    let aiResponse = null;
    
    if (!isAdmin && conversation && conversation.isAiHandling && message?.trim()) {
      console.log('🤖 Generating AI response...');
      
      const aiResult = await handleUserMessageWithAi(message.trim(), targetConversationId);
      
      if (aiResult && aiResult.response) {
        aiResponse = await prisma.chatMessage.create({
          data: {
            conversationId: targetConversationId,
            senderId: 'system',
            senderType: 'ADMIN',
            message: aiResult.response,
            isRead: false,
            isAiGenerated: true,
            aiConfidence: aiResult.confidence,
          },
        });

        await saveAnalytics(targetConversationId, aiResponse.id, aiResult);

        await prisma.chatConversation.update({
          where: { id: targetConversationId },
          data: { lastMessageAt: new Date() },
        });

        console.log('✅ AI response sent:', {
          messageId: aiResponse.id,
          confidence: aiResult.confidence,
          escalated: aiResult.requiresHuman,
        });
      }
    }

    if (!isAdmin) {
      // USER sent message → ALWAYS Notify ADMIN
      console.log('📧 Sending chat notification to admin...');
      const notificationMessage = uploadedAttachments.length > 0 
        ? `${message || ''}\n\n[User attached ${uploadedAttachments.length} file(s)]`
        : message.trim();
        
      sendChatNotificationToAdmin(
        {
          userName: user.name,
          userEmail: user.email,
        },
        notificationMessage
      ).catch(err => console.error('Failed to send admin notification:', err));
    } else {
      if (targetUserEmail && targetUserName) {
        console.log('📧 Sending reply notification to:', targetUserEmail);
        sendChatReplyToUser(
          targetUserEmail,
          targetUserName,
          message?.trim() || 'Support team sent you a file'
        ).catch(err => console.error('Failed to send user notification:', err));
      }
    }

    res.json({
      status: 'success',
      message: newMessage,
      attachments: uploadedAttachments,
      aiResponse: aiResponse || undefined,
      isAiHandling: conversation?.isAiHandling || false,
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
          take: 1,
          include: {
            attachments: true,
          },
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

    const stats = {
      total: await prisma.chatConversation.count(),
      active: await prisma.chatConversation.count({ where: { status: 'ACTIVE' } }),
      closed: await prisma.chatConversation.count({ where: { status: 'CLOSED' } }),
      aiHandling: await prisma.chatConversation.count({ where: { isAiHandling: true, status: 'ACTIVE' } }),
      humanHandling: await prisma.chatConversation.count({ where: { isAiHandling: false, status: 'ACTIVE' } }),
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
          include: {
            attachments: true,
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

    await prisma.chatConversation.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: { status: 'CLOSED' },
    });

    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        status: 'ACTIVE',
        isAiHandling: true,
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

// ═══════════════════════════════════════════════════════════
// USER: Feedback on AI Response
// ═══════════════════════════════════════════════════════════
const submitAiFeedback = async (req, res) => {
  try {
    const { messageId, wasHelpful } = req.body;

    await recordAiFeedback(messageId, wasHelpful);

    res.json({
      status: 'success',
      message: 'Feedback recorded',
    });
  } catch (error) {
    console.error('AI feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record feedback',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// USER: Request Human Support (Escalate from AI)
// ═══════════════════════════════════════════════════════════
const requestHumanSupport = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        isAiHandling: false,
        escalatedToHumanAt: new Date(),
        escalationReason: 'User requested human support',
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    sendChatNotificationToAdmin(
      {
        userName: user.name,
        userEmail: user.email,
      },
      'User requested to speak with human support'
    ).catch(err => console.error('Notification error:', err));

    res.json({
      status: 'success',
      message: 'Connected to support team',
    });
  } catch (error) {
    console.error('Request human support error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to support',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 🆕 NEW: Get Chat History
// ═══════════════════════════════════════════════════════════
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const conversations = await prisma.chatConversation.findMany({
      where: {
        userId: userId,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const total = await prisma.chatConversation.count({
      where: { userId: userId },
    });

    res.json({
      status: 'success',
      conversations,
      total,
      hasMore: total > parseInt(offset) + parseInt(limit),
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get chat history',
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 🆕 NEW: Submit Conversation Feedback
// ═══════════════════════════════════════════════════════════
const submitConversationFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { rating, comment } = req.body;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        feedbackRating: rating,
        feedbackComment: comment,
      },
    });

    res.json({
      status: 'success',
      message: 'Feedback submitted',
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getAllConversations,
  getConversationById,
  closeConversation,
  reopenConversation,
  getUnreadCount,
  startNewConversation,
  submitAiFeedback,
  requestHumanSupport,
  getChatHistory,
  submitConversationFeedback,
};