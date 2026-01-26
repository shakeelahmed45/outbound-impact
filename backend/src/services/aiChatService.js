const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// AI CHATBOT SERVICE - In-House Custom AI
// No external APIs - Uses knowledge base and pattern matching
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// DETECT USER INTENT
// ═══════════════════════════════════════════════════════════

const detectIntent = async (message) => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Get all active intents
  const intents = await prisma.chatIntent.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  // Check each intent's patterns
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        console.log(`✅ Intent detected: ${intent.name}`);
        return intent;
      }
    }
  }

  return null;
};

// ═══════════════════════════════════════════════════════════
// SEARCH KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════

const searchKnowledgeBase = async (message) => {
  const lowerMessage = message.toLowerCase().trim();
  const words = lowerMessage.split(/\s+/);

  // Get all active knowledge base entries
  const allEntries = await prisma.chatKnowledgeBase.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  // Score each entry based on keyword matches
  const scored = allEntries.map(entry => {
    let score = 0;
    let matchedKeywords = [];

    // Check each keyword
    entry.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Exact phrase match (highest score)
      if (lowerMessage.includes(keywordLower)) {
        score += 10;
        matchedKeywords.push(keyword);
      } 
      // Individual word matches
      else {
        const keywordWords = keywordLower.split(/\s+/);
        const matches = keywordWords.filter(kw => words.includes(kw));
        if (matches.length > 0) {
          score += matches.length * 2;
          matchedKeywords.push(keyword);
        }
      }
    });

    // Add priority bonus
    score += entry.priority;

    return {
      ...entry,
      score,
      matchedKeywords,
    };
  });

  // Filter and sort by score
  const matches = scored.filter(entry => entry.score > 0);
  matches.sort((a, b) => b.score - a.score);

  return matches.length > 0 ? matches[0] : null;
};

// ═══════════════════════════════════════════════════════════
// CALCULATE CONFIDENCE SCORE
// ═══════════════════════════════════════════════════════════

const calculateConfidence = (score, maxPossibleScore = 20) => {
  // Normalize score to 0-1 range
  const confidence = Math.min(score / maxPossibleScore, 1.0);
  return parseFloat(confidence.toFixed(2));
};

// ═══════════════════════════════════════════════════════════
// GENERATE AI RESPONSE
// ═══════════════════════════════════════════════════════════

const generateAiResponse = async (message, conversationId) => {
  const startTime = Date.now();

  try {
    // Step 1: Check for intent (greeting, urgent, etc.)
    const intent = await detectIntent(message);
    
    if (intent) {
      const confidence = 0.95; // High confidence for intent matches
      const responseTime = Date.now() - startTime;

      // If requires human, escalate
      if (intent.requiresHuman) {
        await escalateToHuman(conversationId, `Intent: ${intent.name}`);
      }

      return {
        response: intent.response,
        isAiGenerated: true,
        confidence,
        intent: intent.name,
        knowledgeBaseId: null,
        requiresHuman: intent.requiresHuman,
        responseTime,
      };
    }

    // Step 2: Search knowledge base
    const kbMatch = await searchKnowledgeBase(message);
    
    if (kbMatch && kbMatch.score >= 5) {
      const confidence = calculateConfidence(kbMatch.score);
      const responseTime = Date.now() - startTime;

      // Update usage count
      await prisma.chatKnowledgeBase.update({
        where: { id: kbMatch.id },
        data: { usageCount: { increment: 1 } },
      });

      // If confidence too low, suggest human
      const shouldEscalate = confidence < 0.4;
      
      let response = kbMatch.answer;
      
      if (shouldEscalate) {
        response += '\n\n🤔 I\'m not 100% sure this answers your question. Would you like me to connect you with our support team for more detailed help?';
      } else if (confidence < 0.7) {
        response += '\n\n💡 Did this answer your question? If you need more help, I can connect you with our support team!';
      }

      return {
        response,
        isAiGenerated: true,
        confidence,
        intent: null,
        knowledgeBaseId: kbMatch.id,
        requiresHuman: shouldEscalate,
        responseTime,
        matchedKeywords: kbMatch.matchedKeywords,
      };
    }

    // Step 3: No match found - offer to escalate
    const responseTime = Date.now() - startTime;
    
    return {
      response: "I'm not sure I understand your question, but I'd like to help! Here are a few things I can assist with:\n\n" +
                "📤 **Uploading files** - How to add content\n" +
                "📱 **QR Codes** - Creating and using QR codes\n" +
                "🔗 **NFC Tags** - Setting up tap-to-view\n" +
                "📊 **Analytics** - Tracking views and engagement\n" +
                "👥 **Team** - Adding team members\n" +
                "💳 **Billing** - Payments and subscriptions\n\n" +
                "Or I can **connect you with our support team** for personalized help. What works best for you?",
      isAiGenerated: true,
      confidence: 0.3,
      intent: 'no_match',
      knowledgeBaseId: null,
      requiresHuman: false,
      responseTime,
    };

  } catch (error) {
    console.error('AI response generation error:', error);
    const responseTime = Date.now() - startTime;
    
    return {
      response: "I'm having trouble processing your message right now. Let me connect you with our support team who can help! 👋",
      isAiGenerated: true,
      confidence: 0,
      intent: 'error',
      knowledgeBaseId: null,
      requiresHuman: true,
      responseTime,
      error: error.message,
    };
  }
};

// ═══════════════════════════════════════════════════════════
// ESCALATE TO HUMAN
// ═══════════════════════════════════════════════════════════

const escalateToHuman = async (conversationId, reason) => {
  try {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        isAiHandling: false,
        escalatedToHumanAt: new Date(),
        escalationReason: reason,
      },
    });

    console.log(`✅ Conversation ${conversationId} escalated to human: ${reason}`);
    
    // Could send notification to admin here
    // await sendAdminEscalationNotification(conversationId, reason);

  } catch (error) {
    console.error('Escalation error:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// SAVE ANALYTICS
// ═══════════════════════════════════════════════════════════

const saveAnalytics = async (conversationId, messageId, analyticsData) => {
  try {
    await prisma.chatBotAnalytics.create({
      data: {
        conversationId,
        messageId,
        intent: analyticsData.intent,
        knowledgeBaseId: analyticsData.knowledgeBaseId,
        confidence: analyticsData.confidence,
        escalated: analyticsData.requiresHuman || false,
        responseTime: analyticsData.responseTime,
      },
    });
  } catch (error) {
    console.error('Analytics save error:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN FUNCTION: HANDLE USER MESSAGE WITH AI
// ═══════════════════════════════════════════════════════════

const handleUserMessageWithAi = async (message, conversationId) => {
  try {
    console.log('🤖 AI Bot processing message:', message);

    // Check if conversation is still AI-handled
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { isAiHandling: true },
    });

    if (!conversation || !conversation.isAiHandling) {
      console.log('⏩ Conversation already escalated to human, skipping AI');
      return null;
    }

    // Generate AI response
    const aiResult = await generateAiResponse(message, conversationId);

    console.log('✅ AI Response generated:', {
      confidence: aiResult.confidence,
      intent: aiResult.intent,
      requiresHuman: aiResult.requiresHuman,
    });

    // If requires human, escalate
    if (aiResult.requiresHuman) {
      await escalateToHuman(conversationId, aiResult.intent || 'Low confidence');
    }

    return aiResult;

  } catch (error) {
    console.error('AI handling error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// USER FEEDBACK ON AI RESPONSE
// ═══════════════════════════════════════════════════════════

const recordAiFeedback = async (messageId, wasHelpful) => {
  try {
    await prisma.chatBotAnalytics.updateMany({
      where: { messageId },
      data: { wasHelpful },
    });
    
    console.log(`✅ Feedback recorded for message ${messageId}: ${wasHelpful ? 'Helpful' : 'Not helpful'}`);
  } catch (error) {
    console.error('Feedback recording error:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// GET AI STATISTICS
// ═══════════════════════════════════════════════════════════

const getAiStatistics = async (days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.chatBotAnalytics.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const stats = {
      totalResponses: analytics.length,
      escalated: analytics.filter(a => a.escalated).length,
      avgConfidence: analytics.length > 0 
        ? analytics.reduce((sum, a) => sum + parseFloat(a.confidence || 0), 0) / analytics.length 
        : 0,
      helpful: analytics.filter(a => a.wasHelpful === true).length,
      notHelpful: analytics.filter(a => a.wasHelpful === false).length,
      avgResponseTime: analytics.length > 0
        ? analytics.reduce((sum, a) => sum + (a.responseTime || 0), 0) / analytics.length
        : 0,
    };

    return stats;
  } catch (error) {
    console.error('Statistics error:', error);
    return null;
  }
};

module.exports = {
  handleUserMessageWithAi,
  generateAiResponse,
  detectIntent,
  searchKnowledgeBase,
  escalateToHuman,
  saveAnalytics,
  recordAiFeedback,
  getAiStatistics,
};