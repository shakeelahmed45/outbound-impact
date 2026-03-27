const prisma = require('../lib/prisma');

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[?!.,;]/g, '') 
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim();
};

const extractKeyPhrases = (text) => {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  const phrases = [];
  
  // Single words
  phrases.push(...words);
  
  // Two-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }
  
  // Three-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  
  return phrases;
};

const detectIntent = async (message) => {
  const normalized = normalizeText(message);
  
  const intents = await prisma.chatIntent.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (normalized.includes(normalizeText(pattern))) {
        console.log(`✅ Intent detected: ${intent.name}`);
        return intent;
      }
    }
  }

  return null;
};

// ═══════════════════════════════════════════════════════════
// SMART KNOWLEDGE BASE SEARCH
// ═══════════════════════════════════════════════════════════

const searchKnowledgeBase = async (message) => {
  const normalized = normalizeText(message);
  const userPhrases = extractKeyPhrases(message);

  const allEntries = await prisma.chatKnowledgeBase.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  if (allEntries.length === 0) {
    console.log('⚠️ No knowledge base entries found! Database might be empty.');
    return null;
  }

  console.log(`🔍 Searching ${allEntries.length} KB entries for: "${message}"`);

  const scored = allEntries.map(entry => {
    let score = 0;
    let matchedKeywords = [];

    entry.keywords.forEach(keyword => {
      const normalizedKeyword = normalizeText(keyword);
      
      // EXACT PHRASE MATCH (highest score)
      if (normalized.includes(normalizedKeyword)) {
        score += 20;
        matchedKeywords.push(keyword);
        console.log(`  ✅ Exact match: "${keyword}" (+20)`);
      }
      // PARTIAL WORD MATCHES
      else {
        const keywordWords = normalizedKeyword.split(' ');
        const matchCount = keywordWords.filter(kw => 
          userPhrases.some(phrase => phrase.includes(kw))
        ).length;
        
        if (matchCount > 0) {
          score += matchCount * 5;
          matchedKeywords.push(keyword);
          console.log(`  ✅ Partial match: "${keyword}" (+${matchCount * 5})`);
        }
      }
    });

    // Question similarity bonus
    const normalizedQuestion = normalizeText(entry.question);
    if (normalized.includes(normalizedQuestion) || normalizedQuestion.includes(normalized)) {
      score += 15;
      console.log(`  ✅ Question match (+15)`);
    }

    // Priority bonus
    score += entry.priority;

    return {
      ...entry,
      score,
      matchedKeywords,
    };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  console.log('📊 Top 3 scores:', scored.slice(0, 3).map(e => ({
    question: e.question,
    score: e.score,
    keywords: e.matchedKeywords,
  })));

  const bestMatch = scored[0];
  
  // Accept if score > 5 (very forgiving)
  if (bestMatch && bestMatch.score > 5) {
    console.log(`✅ MATCH FOUND: ${bestMatch.question} (score: ${bestMatch.score})`);
    return bestMatch;
  }

  console.log('❌ No good match found');
  return null;
};

// ═══════════════════════════════════════════════════════════
// CALCULATE CONFIDENCE SCORE
// ═══════════════════════════════════════════════════════════

const calculateConfidence = (score) => {
  // Score 40+ = 0.95 confidence
  // Score 20-39 = 0.75 confidence
  // Score 10-19 = 0.60 confidence
  // Score 5-9 = 0.45 confidence
  
  if (score >= 40) return 0.95;
  if (score >= 20) return 0.75;
  if (score >= 10) return 0.60;
  if (score >= 5) return 0.45;
  return 0.30;
};

// ═══════════════════════════════════════════════════════════
// GENERATE AI RESPONSE
// ═══════════════════════════════════════════════════════════

const generateAiResponse = async (message, conversationId) => {
  const startTime = Date.now();

  try {
    console.log('🤖 Processing message:', message);

    // Step 1: Check for intent
    const intent = await detectIntent(message);
    
    if (intent) {
      const confidence = 0.95;
      const responseTime = Date.now() - startTime;

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

      const shouldEscalate = confidence < 0.5;
      
      let response = kbMatch.answer;
      
      if (shouldEscalate) {
        response += '\n\n💭 Not sure if this fully answers your question? I can connect you with our support team for detailed help!';
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

    // Step 3: No match - offer options
    const responseTime = Date.now() - startTime;
    
    return {
      response: "I'd be happy to help you! I can assist with:\n\n" +
                "📤 **Uploading Content** - How to add images, videos, and files\n" +
                "🎨 **Creating Streams** - Building content collections\n" +
                "📱 **QR Codes** - Generating and downloading QR codes\n" +
                "🔗 **NFC Tags** - Setting up tap-to-view experiences\n" +
                "📊 **Analytics** - Tracking views and engagement\n" +
                "👥 **Team Management** - Adding and managing team members\n" +
                "💳 **Billing & Plans** - Subscriptions and payments\n\n" +
                "Which would you like to know more about? Or I can **connect you with our support team** for personalized help! 😊",
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
      response: "I'm having trouble processing your message. Let me connect you with our support team who can help! 👋",
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

    console.log(`✅ Conversation ${conversationId} escalated: ${reason}`);

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
// HANDLE USER MESSAGE WITH AI
// ═══════════════════════════════════════════════════════════

const handleUserMessageWithAi = async (message, conversationId) => {
  try {
    console.log('🤖 AI Bot processing:', message);

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { isAiHandling: true },
    });

    if (!conversation || !conversation.isAiHandling) {
      console.log('⏩ Conversation handled by human, skipping AI');
      return null;
    }

    const aiResult = await generateAiResponse(message, conversationId);

    console.log('✅ AI Response:', {
      confidence: aiResult.confidence,
      intent: aiResult.intent,
      requiresHuman: aiResult.requiresHuman,
    });

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
// USER FEEDBACK
// ═══════════════════════════════════════════════════════════

const recordAiFeedback = async (messageId, wasHelpful) => {
  try {
    await prisma.chatBotAnalytics.updateMany({
      where: { messageId },
      data: { wasHelpful },
    });
    
    console.log(`✅ Feedback recorded: ${wasHelpful ? 'Helpful' : 'Not helpful'}`);
  } catch (error) {
    console.error('Feedback error:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// GET STATISTICS
// ═══════════════════════════════════════════════════════════

const getAiStatistics = async (days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.chatBotAnalytics.findMany({
      where: { createdAt: { gte: startDate } },
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