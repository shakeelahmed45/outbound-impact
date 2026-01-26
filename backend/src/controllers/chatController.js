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
          isAiHandling: true, // Start with AI bot
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

    // ═══════════════════════════════════════════════════════════
    // DETERMINE TARGET CONVERSATION
    // ═══════════════════════════════════════════════════════════
    
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

      // When admin replies, stop AI handling
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
      // USER SENDING MESSAGE
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

    // ═══════════════════════════════════════════════════════════
    // CREATE USER/ADMIN MESSAGE
    // ═══════════════════════════════════════════════════════════
    
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

    // ═══════════════════════════════════════════════════════════
    // UPLOAD FILE ATTACHMENTS
    // ═══════════════════════════════════════════════════════════
    
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

    // Update conversation lastMessageAt
    await prisma.chatConversation.update({
      where: { id: targetConversationId },
      data: { lastMessageAt: new Date() },
    });

    // ═══════════════════════════════════════════════════════════
    // AI BOT AUTO-RESPONSE (only for user messages)
    // ═══════════════════════════════════════════════════════════
    
    let aiResponse = null;
    
    if (!isAdmin && conversation && conversation.isAiHandling && message?.trim()) {
      console.log('🤖 Generating AI response...');
      
      const aiResult = await handleUserMessageWithAi(message.trim(), targetConversationId);
      
      if (aiResult && aiResult.response) {
        // Create AI bot message
        aiResponse = await prisma.chatMessage.create({
          data: {
            conversationId: targetConversationId,
            senderId: 'system', // System/Bot sender
            senderType: 'ADMIN', // Display as admin/support
            message: aiResult.response,
            isRead: false,
            isAiGenerated: true,
            aiConfidence: aiResult.confidence,
          },
        });

        // Save analytics
        await saveAnalytics(targetConversationId, aiResponse.id, aiResult);

        // Update conversation
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

    // ═══════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════
    
    if (!isAdmin) {
      // USER sent message → Notify ADMIN (only if not handled by AI)
      if (!conversation?.isAiHandling || uploadedAttachments.length > 0) {
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
      }
    } else {
      // ADMIN sent message → Notify USER
      if (targetUserEmail && targetUserName) {
        console.log('📧 Sending reply notification to:', targetUserEmail);
        sendChatReplyToUser(
          targetUserEmail,
          targetUserName,
          message?.trim() || 'Support team sent you a file'
        ).catch(err => console.error('Failed to send user notification:', err));
      }
    }

    // ═══════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════

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

// ... (rest of functions: closeConversation, reopenConversation, getUnreadCount, startNewConversation remain same as before)

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

    // Send notification to admin
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

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getAllConversations,
  getConversationById,
  closeConversation,
  reopenConversation,
  getUnreadCount,
  startNewConversation,
  submitAiFeedback,
  requestHumanSupport,
};