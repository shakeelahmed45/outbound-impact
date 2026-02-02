const prisma = require('../lib/prisma');
const { sendChatNotificationToAdmin, sendChatReplyToUser } = require('../services/emailService');
const { handleUserMessageWithFreeAi, saveAiAnalytics } = require('../services/freeAiChatService');
const { uploadChatAttachment, getMessageAttachments } = require('../services/chatFileService');

// ═══════════════════════════════════════════════════════════
// 🆕 NEW: AI CHATBOT WIDGET FUNCTIONS (FIXED - No isUser/isAi)
// ═══════════════════════════════════════════════════════════

// Create conversation (for widget)
const createConversation = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user already has an active conversation
    let conversation = await prisma.chatConversation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    // If exists, return it
    if (conversation) {
      return res.json({
        status: 'success',
        conversation,
      });
    }

    // Create new conversation
    conversation = await prisma.chatConversation.create({
      data: {
        userId,
        status: 'ACTIVE',
        isAiHandling: true,
      },
    });

    res.json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create conversation',
    });
  }
};

// Get conversation (for widget)
const getConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
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

// Get messages for conversation (for widget)
const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId: id,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ✅ FIXED: Add isUser and isAi flags to response (not in database)
    const messagesWithFlags = messages.map(msg => ({
      ...msg,
      isUser: msg.senderType === 'USER',
      isAi: msg.isAiGenerated === true,
    }));

    res.json({
      status: 'success',
      messages: messagesWithFlags,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get messages',
    });
  }
};

// Send message to conversation (for widget with FREE AI) - ✅ FIXED
const sendConversationMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message content is required',
      });
    }

    // Verify conversation belongs to user
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    // ✅ FIXED: Create user message (removed isUser and isAi fields)
    const userMessage = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        senderType: 'USER',
        message: content.trim(),
        isRead: false,
        isAiGenerated: false,
      },
    });

    // Update conversation's last message time
    await prisma.chatConversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // Get FREE AI response if AI is handling
    let aiResponse = null;
    if (conversation.isAiHandling) {
      try {
        console.log('🤖 Requesting FREE AI response...');
        const aiResult = await handleUserMessageWithFreeAi(prisma, content.trim(), id);
        
        if (aiResult && aiResult.response) {
          // ✅ FIXED: Create AI message (removed isUser and isAi fields)
          const aiMessage = await prisma.chatMessage.create({
            data: {
              conversationId: id,
              senderId: 'system',
              senderType: 'ADMIN',
              message: aiResult.response,
              isRead: false,
              isAiGenerated: true,
              aiConfidence: aiResult.confidence,
            },
          });

          // Save analytics
          await saveAiAnalytics(prisma, id, aiMessage.id, aiResult);

          aiResponse = {
            id: aiMessage.id,
            response: aiResult.response,
            confidence: aiResult.confidence,
            model: aiResult.model,
            isUser: false,
            isAi: true,
          };

          console.log('✅ FREE AI response sent!');
        }
      } catch (aiError) {
        console.error('AI response error:', aiError);
        // Continue without AI response - don't fail the whole request
      }
    }

    res.json({
      status: 'success',
      message: {
        ...userMessage,
        isUser: true,
        isAi: false,
      },
      aiResponse,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
    });
  }
};

// Submit feedback on message (for widget)
const submitMessageFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { wasHelpful } = req.body;

    // Find the message
    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found',
      });
    }

    // Verify message belongs to user's conversation
    if (message.conversation.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    // Update analytics with feedback
    await prisma.chatBotAnalytics.updateMany({
      where: { messageId: id },
      data: { wasHelpful },
    });

    res.json({
      status: 'success',
      message: 'Feedback recorded',
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
    });
  }
};

// Get user conversations (for widget)
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json({
      status: 'success',
      conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversations',
    });
  }
};

// Close conversation (for widget)
const closeConversationWidget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
    }

    await prisma.chatConversation.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    res.json({
      status: 'success',
      message: 'Conversation closed',
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
// EXISTING USER FUNCTIONS (ALL PRESERVED - NO CHANGES)
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

    const isAdmin = user.role === 'ADMIN' || user.role === 'CUSTOMER_SUPPORT';
    const senderType = isAdmin ? 'ADMIN' : 'USER';

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
      for (const file of files) {
        const uploadResult = await uploadChatAttachment(file, newMessage.id, actualUserId);
        if (uploadResult.success) {
          uploadedAttachments.push(uploadResult.attachment);
        }
      }
    }

    await prisma.chatConversation.update({
      where: { id: targetConversationId },
      data: { lastMessageAt: new Date() },
    });

    let aiResponse = null;
    
    if (!isAdmin && conversation && conversation.isAiHandling && message?.trim()) {
      const aiResult = await handleUserMessageWithFreeAi(prisma, message.trim(), targetConversationId);
      
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

        await saveAiAnalytics(prisma, targetConversationId, aiResponse.id, aiResult);

        await prisma.chatConversation.update({
          where: { id: targetConversationId },
          data: { lastMessageAt: new Date() },
        });
      }
    }

    if (!isAdmin) {
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

    const userChatCounts = {};
    for (const conv of conversations) {
      const userId = conv.userId;
      if (!userChatCounts[userId]) {
        userChatCounts[userId] = {
          total: 0,
          active: 0,
          closed: 0,
        };
      }
      userChatCounts[userId].total++;
      if (conv.status === 'ACTIVE') {
        userChatCounts[userId].active++;
      } else {
        userChatCounts[userId].closed++;
      }
    }

    const conversationsWithCounts = conversations.map(conv => ({
      ...conv,
      userChatCount: userChatCounts[conv.userId],
    }));

    const stats = {
      total: await prisma.chatConversation.count(),
      active: await prisma.chatConversation.count({ where: { status: 'ACTIVE' } }),
      closed: await prisma.chatConversation.count({ where: { status: 'CLOSED' } }),
      aiHandling: await prisma.chatConversation.count({ 
        where: { isAiHandling: true, status: 'ACTIVE' } 
      }),
      humanHandling: await prisma.chatConversation.count({ 
        where: { isAiHandling: false, status: 'ACTIVE' } 
      }),
      unread: await prisma.chatMessage.count({
        where: {
          senderType: 'USER',
          isRead: false,
        },
      }),
      withFeedback: await prisma.chatConversation.count({
        where: { feedbackRating: { not: null } }
      }),
      averageRating: await prisma.chatConversation.aggregate({
        where: { feedbackRating: { not: null } },
        _avg: { feedbackRating: true }
      }).then(result => result._avg.feedbackRating || 0),
    };

    res.json({
      status: 'success',
      conversations: conversationsWithCounts,
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

const getUserChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await prisma.chatConversation.findMany({
      where: {
        userId: userId
      },
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
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalChats: conversations.length,
      activeChats: conversations.filter(c => c.status === 'ACTIVE').length,
      closedChats: conversations.filter(c => c.status === 'CLOSED').length,
      totalMessages: conversations.reduce((sum, c) => sum + c._count.messages, 0),
      averageRating: conversations
        .filter(c => c.feedbackRating)
        .reduce((sum, c, idx, arr) => sum + c.feedbackRating / arr.length, 0) || 0,
      chatsWithFeedback: conversations.filter(c => c.feedbackRating).length,
    };

    res.json({
      status: 'success',
      user: conversations[0]?.user || null,
      conversations,
      stats,
    });
  } catch (error) {
    console.error('Get user chat history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get chat history',
    });
  }
};

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

const submitAiFeedback = async (req, res) => {
  try {
    const { messageId, wasHelpful } = req.body;

    await prisma.chatBotAnalytics.updateMany({
      where: { messageId },
      data: { wasHelpful },
    });

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
  createConversation,
  getConversation,
  getConversationMessages,
  sendConversationMessage,
  submitMessageFeedback,
  getUserConversations,
  closeConversationWidget,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getAllConversations,
  getConversationById,
  getUserChatHistory,
  closeConversation,
  reopenConversation,
  getUnreadCount,
  startNewConversation,
  submitAiFeedback,
  requestHumanSupport,
  getChatHistory,
  submitConversationFeedback,
};