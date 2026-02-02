const Groq = require('groq-sdk');

// Initialize Groq AI (100% FREE!)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // FREE API key - no credit card needed!
});

// ═══════════════════════════════════════════════════════════
// OUTBOUND IMPACT PLATFORM KNOWLEDGE - COMPREHENSIVE
// ═══════════════════════════════════════════════════════════

const OI_PLATFORM_KNOWLEDGE = `
# OUTBOUND IMPACT PLATFORM - COMPLETE GUIDE

## PLATFORM OVERVIEW
Outbound Impact (OI) is a comprehensive SaaS media sharing platform that enables users to:
- Upload and share content (images, videos, audio, documents, text, embedded links)
- Create organized collections called "Streams"
- Generate QR codes and NFC tags for physical distribution
- Track analytics (views, locations, devices, browsers)
- Manage teams with role-based access
- Password-protect content for community access
- Share via social media and direct downloads

## CORE FEATURES

### 1. CONTENT UPLOAD & MANAGEMENT
**File Types Supported:**
- Images: PNG, JPG, JPEG, GIF, WebP
- Videos: MP4, MOV, AVI, WebM
- Audio: MP3, WAV, OGG, M4A
- Documents: PDF, DOC, DOCX, TXT

**Maximum file size:** 100MB per file
**Storage:** Secure CDN (Bunny.net) for worldwide fast access

**Upload Methods:**
1. **Direct File Upload** - Drag & drop or browse
2. **Text Content with CTA Buttons** - Create text with actionable buttons (Learn More, Buy Now, Contact Us, etc.)
3. **Embed Links** - YouTube, Vimeo, SoundCloud, Spotify, Google Drive, Google Docs, Google Sheets, Google Slides

**Item Management:**
- Add custom thumbnails (PNG, JPG, GIF, WebP, max 5MB)
- Edit titles and descriptions
- Add to multiple Streams
- Share individually or in collections
- Download original files
- Delete items

### 2. STREAMS (CONTENT COLLECTIONS)
**What are Streams?**
Streams are organized collections of content items that can be shared via QR codes, NFC tags, or direct links.

**Stream Features:**
- Create unlimited Streams (depends on plan)
- Add multiple items to one Stream
- Reorder items with drag-and-drop
- Password protection (keep QR public, content private)
- Custom display names
- Social sharing (Facebook, Twitter, LinkedIn, WhatsApp, Email)
- Download entire Stream as ZIP
- Analytics per Stream

**Password Protection:**
- Allows QR codes to remain physically public
- Content access restricted to community members with password
- Perfect for exclusive content, members-only materials, internal documents

### 3. QR CODES & NFC TAGS
**QR Code Generation:**
- Automatic generation for every Stream
- High-resolution downloads (PNG format)
- Customizable designs
- Print-ready quality
- Free to generate and download

**NFC Tags:**
- Tap-to-view experiences
- Compatible with all NFC-enabled devices
- Same content as QR codes
- Perfect for interactive displays, business cards, products

**Use Cases:**
- Event programs and schedules
- Product packaging
- Business cards
- Museum exhibits
- Restaurant menus
- Real estate listings
- Portfolio presentations

### 4. ANALYTICS & TRACKING
**Metrics Available:**
- Total views
- Unique visitors
- Geographic locations (countries)
- Device types (mobile, desktop, tablet)
- Browsers used
- Referrer sources
- Time-of-day activity
- View trends over time

**Advanced Analytics (Enterprise):**
- Heatmaps
- Conversion tracking
- Custom reports
- Export data (CSV, PDF)
- API access for integration

### 5. TEAM MANAGEMENT
**Organization Features:**
- Add team members by email
- Role-based access control:
  - **ADMIN**: Full access, can manage everything
  - **EDITOR**: Can create, edit, upload content
  - **VIEWER**: Can only view content, no editing
  - **CONTRIBUTOR**: Can upload but not delete

**Team Collaboration:**
- Shared storage pool
- Centralized content library
- Activity logs
- Permission management
- Remove team members

### 6. SUBSCRIPTION PLANS

**Individual Plan:**
- Price: $85/year
- Storage: 250GB
- Duration: 12 months
- Features: All core features, personal use

**Small Organization Plan:**
- Price: $35/month
- Storage: 250GB
- Team: Up to 5 users
- Features: Team collaboration, basic analytics

**Medium Organization Plan:**
- Price: $60/month
- Storage: 500GB
- Team: Up to 20 users
- Features: Advanced team tools, priority support

**Enterprise Plan:**
- Price: $99+/month (custom pricing)
- Storage: 1.5TB+ (scalable)
- Team: 50+ users (unlimited)
- Features:
  - White Label customization
  - API access
  - Two-Factor Authentication (2FA)
  - Custom integrations
  - Dedicated account manager
  - SLA guarantees

### 7. BILLING & PAYMENTS
**Payment Methods:**
- Credit/Debit cards (Visa, Mastercard, Amex)
- Stripe secure payment processing

**Subscription Management:**
- Upgrade/downgrade anytime
- Prorate charges automatically
- Cancel anytime (access until period end)
- Refund policy: 7-day money-back guarantee

**Coupons:**
- Apply at checkout
- Percentage or fixed amount discounts
- Promo codes available seasonally

### 8. ENTERPRISE FEATURES

**White Label:**
- Custom domain (yourcompany.com)
- Custom branding (logo, colors)
- Remove OI branding
- Custom email templates

**API Access:**
- RESTful API
- Full CRUD operations
- Webhook support
- Rate limiting: depends on plan
- Documentation: docs.outboundimpact.org/api

**Two-Factor Authentication (2FA):**
- Email-based verification
- Enhanced security for sensitive content
- Required for enterprise accounts

**Custom Integrations:**
- Zapier integration
- Webhooks for automation
- CRM integrations
- SSO (Single Sign-On) available

### 9. SOCIAL SHARING
Share Streams via:
- Facebook
- Twitter (X)
- LinkedIn
- WhatsApp
- Email
- Copy direct link
- Embed codes (coming soon)

### 10. ACCOUNT & SETTINGS
**Profile Management:**
- Update name and email
- Change password
- Upload profile picture
- Delete account (with confirmation)

**Storage Management:**
- View storage usage
- Delete items to free space
- Upgrade for more storage

**Notifications:**
- Email notifications for:
  - Team invitations
  - New team member activity
  - Subscription renewals
  - Storage warnings

### 11. SUPPORT RESOURCES
**Live Chat:**
- AI-powered instant responses
- 24/7 availability
- Human escalation for complex issues
- File attachments support

**Help Center:**
- Comprehensive user guides
- Video tutorials
- FAQ section
- Troubleshooting guides

**Contact:**
- Email: support@outboundimpact.org
- Response time: Within 24 hours (priority for paid plans)

## COMMON WORKFLOWS

### Creating & Sharing a Portfolio
1. Upload content (images, videos)
2. Create a new Stream called "Portfolio"
3. Add items to the Stream
4. Generate QR code
5. Share via social media or print QR code

### Password-Protected Member Content
1. Upload content
2. Create Stream (e.g., "Member Resources")
3. Enable password protection
4. Share QR code publicly
5. Only share password with authorized members

### Team Collaboration
1. Organization owner invites team members
2. Assign appropriate roles (ADMIN, EDITOR, VIEWER)
3. Team uploads content to shared library
4. All team members access centralized content
5. Track activity and permissions

## TECHNICAL SPECS
- **Frontend:** React with Vite, Tailwind CSS
- **Backend:** Node.js with Express, Prisma ORM
- **Database:** PostgreSQL
- **CDN:** Bunny.net for media storage
- **Hosting:** Railway (backend), Vercel (frontend)
- **Payments:** Stripe
- **Email:** Professional SMTP service

## SECURITY & PRIVACY
- End-to-end encrypted connections (HTTPS)
- Secure password hashing (bcrypt)
- GDPR compliant
- Data stored in secure data centers
- Regular security audits
- Optional 2FA for enterprise users

## BEST PRACTICES
1. **Optimize file sizes** before uploading for faster loading
2. **Use thumbnails** for better visual presentation
3. **Organize with Streams** for easier management
4. **Password-protect sensitive content** for security
5. **Monitor analytics** to understand audience engagement
6. **Regularly clean up** unused items to save storage
`;

// ═══════════════════════════════════════════════════════════
// GENERATE FREE AI RESPONSE USING GROQ (100% FREE!)
// ═══════════════════════════════════════════════════════════

const generateFreeAiResponse = async (userMessage, conversationHistory = []) => {
  const startTime = Date.now();
  
  try {
    console.log('🤖 Groq AI processing (FREE!):', userMessage);

    // Build conversation history for context
    const messages = [
      {
        role: 'system',
        content: `You are a professional, friendly customer support assistant for Outbound Impact (OI), a comprehensive SaaS media sharing platform.

YOUR PERSONALITY:
- Professional yet warm and approachable
- Patient and understanding
- Clear and concise in explanations
- Proactive in offering help
- Never says "I don't know" - always tries to help or escalate

YOUR KNOWLEDGE:
${OI_PLATFORM_KNOWLEDGE}

RESPONSE GUIDELINES:
1. **Always be helpful**: If you don't have exact information, provide related helpful guidance
2. **Be concise**: Keep responses under 200 words unless detailed steps are needed
3. **Use formatting**: 
   - ✅ Checkmarks for features/benefits
   - 📝 Numbered steps for instructions
   - 💡 Emoji for tips
4. **Escalate when needed**: For billing issues, technical bugs, or urgent matters, offer to connect with human support
5. **Stay on topic**: Focus on Outbound Impact platform features and usage
6. **Be encouraging**: Use positive language and emojis appropriately

IMPORTANT:
- Never make up features that don't exist in the knowledge base
- If uncertain, offer to connect user with support team
- Always provide actionable next steps
- Reference specific features from the knowledge base when relevant`
      },
      ...conversationHistory.map(msg => ({
        role: msg.senderType === 'USER' ? 'user' : 'assistant',
        content: msg.message
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Call Groq AI API (100% FREE!)
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile', // FREE! Fast! Powerful!
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
    });

    const aiResponse = response.choices[0].message.content;
    const responseTime = Date.now() - startTime;

    console.log('✅ Groq AI Response generated (FREE!):', {
      length: aiResponse.length,
      responseTime: `${responseTime}ms`,
      model: response.model,
      tokensUsed: response.usage.total_tokens,
    });

    // Determine if human escalation needed based on keywords
    const escalationKeywords = ['billing issue', 'refund', 'technical error', 'bug', 'not working', 'urgent', 'emergency'];
    const requiresHuman = escalationKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );

    return {
      response: aiResponse,
      isAiGenerated: true,
      confidence: 0.95,
      model: 'llama-3.1-70b-versatile (FREE)',
      requiresHuman,
      responseTime,
      usage: {
        totalTokens: response.usage.total_tokens,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      }
    };

  } catch (error) {
    console.error('Groq AI error:', error);
    
    // Fallback response
    return {
      response: "I apologize, but I'm having trouble processing your request right now. Let me connect you with our support team who can help you immediately! 👋",
      isAiGenerated: true,
      confidence: 0,
      model: 'fallback',
      requiresHuman: true,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
};

// ═══════════════════════════════════════════════════════════
// ESCALATE TO HUMAN SUPPORT
// ═══════════════════════════════════════════════════════════

const escalateToHuman = async (prisma, conversationId, reason) => {
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

const saveAiAnalytics = async (prisma, conversationId, messageId, analyticsData) => {
  try {
    await prisma.chatBotAnalytics.create({
      data: {
        conversationId,
        messageId,
        intent: 'groq_ai_response',
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
// HANDLE USER MESSAGE WITH FREE AI
// ═══════════════════════════════════════════════════════════

const handleUserMessageWithFreeAi = async (prisma, message, conversationId) => {
  try {
    console.log('🤖 FREE AI processing:', message);

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { 
        isAiHandling: true,
        id: true,
      },
    });

    if (!conversation || !conversation.isAiHandling) {
      console.log('⏩ Conversation handled by human, skipping AI');
      return null;
    }

    // Get recent conversation history for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Last 10 messages for context
      select: {
        message: true,
        senderType: true,
      },
    });

    // Reverse to chronological order
    const conversationHistory = recentMessages.reverse();

    // Generate AI response using Groq (FREE!)
    const aiResult = await generateFreeAiResponse(message, conversationHistory);

    console.log('✅ FREE AI Response:', {
      confidence: aiResult.confidence,
      model: aiResult.model,
      requiresHuman: aiResult.requiresHuman,
      tokensUsed: aiResult.usage?.totalTokens || 'N/A',
    });

    if (aiResult.requiresHuman) {
      await escalateToHuman(prisma, conversationId, aiResult.model || 'AI escalation');
    }

    return aiResult;

  } catch (error) {
    console.error('AI handling error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// GET AI STATISTICS
// ═══════════════════════════════════════════════════════════

const getAiStatistics = async (prisma, days = 7) => {
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
  generateFreeAiResponse,
  handleUserMessageWithFreeAi,
  escalateToHuman,
  saveAiAnalytics,
  getAiStatistics,
};