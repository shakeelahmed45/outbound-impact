const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Live Chat AI Knowledge Base...\n');

  // ═══════════════════════════════════════════════════════════
  // CLEAR EXISTING DATA (OPTIONAL - REMOVE IF YOU WANT TO KEEP)
  // ═══════════════════════════════════════════════════════════
  
  console.log('🗑️  Clearing existing knowledge base...');
  await prisma.chatKnowledgeBase.deleteMany({});
  await prisma.chatIntent.deleteMany({});
  console.log('✅ Cleared!\n');

  // ═══════════════════════════════════════════════════════════
  // KNOWLEDGE BASE - COMPREHENSIVE FAQs
  // ═══════════════════════════════════════════════════════════

  console.log('📚 Adding Knowledge Base Entries...');

  const knowledgeBase = await prisma.chatKnowledgeBase.createMany({
    data: [
      // ═══════════════════════════════════════════════════════
      // UPLOADING CONTENT
      // ═══════════════════════════════════════════════════════
      {
        category: 'Upload',
        question: 'How do I upload files?',
        answer: '**Uploading content to Outbound Impact is easy!** 🚀\n\n' +
                '**Step 1:** Go to your Dashboard and click the **"Upload"** button\n' +
                '**Step 2:** Select your files (images, videos, audio, documents)\n' +
                '**Step 3:** Files will be added to your library\n' +
                '**Step 4:** Add them to a Stream and generate your QR code!\n\n' +
                '**Supported formats:** Images (PNG, JPG, GIF), Videos (MP4, MOV), Audio (MP3, WAV), Documents (PDF, DOC)\n' +
                '**Max file size:** 100MB per file\n\n' +
                'Need help? Just ask! 😊',
        keywords: [
          'upload', 'upload file', 'upload files', 'uploading', 'add file', 'add files',
          'how to upload', 'upload content', 'add content', 'upload media',
          'upload image', 'upload video', 'upload document', 'upload photo',
        ],
        priority: 10,
      },
      {
        category: 'Upload',
        question: 'What file types can I upload?',
        answer: '**You can upload these file types:** 📁\n\n' +
                '**Images:** PNG, JPG, JPEG, GIF, WebP\n' +
                '**Videos:** MP4, MOV, AVI, WebM\n' +
                '**Audio:** MP3, WAV, OGG, M4A\n' +
                '**Documents:** PDF, DOC, DOCX, TXT\n\n' +
                '**Maximum file size:** 100MB per file\n\n' +
                'All files are stored securely on our CDN for fast, reliable access! 🔒',
        keywords: [
          'file types', 'file format', 'supported files', 'what files',
          'can i upload', 'file size', 'max size', 'maximum size',
        ],
        priority: 9,
      },

      // ═══════════════════════════════════════════════════════
      // STREAMS (was Campaigns)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Streams',
        question: 'How do I create a Stream?',
        answer: '**Creating a Stream is simple!** 🎨\n\n' +
                '**Step 1:** Click **"Create Stream"** in your Dashboard\n' +
                '**Step 2:** Give your Stream a name and description\n' +
                '**Step 3:** Add content items from your library\n' +
                '**Step 4:** Customize the appearance (optional)\n' +
                '**Step 5:** Click **"Save"** and generate your QR code!\n\n' +
                '**What are Streams?** Collections of your content (images, videos, etc.) that people can access by scanning a QR code or tapping an NFC tag.\n\n' +
                '**Use cases:** Portfolios, menus, event programs, memorial tributes, product catalogs, and more!',
        keywords: [
          'create stream', 'new stream', 'make stream', 'create campaign',
          'how to create', 'stream', 'streams', 'campaign', 'campaigns',
          'create collection', 'new campaign',
        ],
        priority: 10,
      },
      {
        category: 'Streams',
        question: 'What is a Stream?',
        answer: '**A Stream is a collection of your content!** 🎯\n\n' +
                'Think of it like a digital album or portfolio. You can add:\n' +
                '• Images and photos 📸\n' +
                '• Videos 🎥\n' +
                '• Audio files 🎵\n' +
                '• Text and descriptions 📝\n' +
                '• Documents 📄\n\n' +
                'Each Stream gets its own **QR code** and **NFC tag link**, so people can access your content instantly!\n\n' +
                '**Popular uses:**\n' +
                '• Memorial services (photos, videos, tributes)\n' +
                '• Portfolios (showcase your work)\n' +
                '• Menus (restaurant or event menus)\n' +
                '• Product catalogs\n' +
                '• Event programs',
        keywords: [
          'what is stream', 'stream', 'streams', 'what is campaign',
          'campaign', 'campaigns', 'collection', 'portfolio',
        ],
        priority: 10,
      },
      {
        category: 'Streams',
        question: 'Can I edit a Stream after creating it?',
        answer: '**Yes! You can edit Streams anytime!** ✏️\n\n' +
                '**To edit a Stream:**\n' +
                '1. Go to your Dashboard\n' +
                '2. Find the Stream you want to edit\n' +
                '3. Click **"Edit"** or the settings icon\n' +
                '4. Make your changes (add/remove content, update details)\n' +
                '5. Click **"Save"**\n\n' +
                '**Important:** Your QR code and NFC tag stay the same! Updates appear instantly - no need to regenerate codes! 🎉',
        keywords: [
          'edit stream', 'modify stream', 'change stream', 'update stream',
          'edit campaign', 'modify campaign', 'change content',
        ],
        priority: 9,
      },

      // ═══════════════════════════════════════════════════════
      // QR CODES
      // ═══════════════════════════════════════════════════════
      {
        category: 'QR Codes',
        question: 'How do I create a QR code?',
        answer: '**Creating QR codes is instant!** 📱\n\n' +
                '**Step 1:** Create a Stream with your content\n' +
                '**Step 2:** Click **"Generate QR Code"** on your Stream\n' +
                '**Step 3:** Download your QR code (PNG or SVG format)\n' +
                '**Step 4:** Share it anywhere - print, digital, wherever!\n\n' +
                '**Your QR code:**\n' +
                '• Works forever (never expires!)\n' +
                '• Can be reprinted anytime\n' +
                '• Updates automatically when you edit your Stream\n' +
                '• Tracks scans and analytics\n\n' +
                'Perfect for business cards, posters, flyers, packaging, and more! 🎨',
        keywords: [
          'qr code', 'qr', 'create qr', 'generate qr', 'make qr code',
          'qr code generator', 'download qr', 'get qr code',
        ],
        priority: 10,
      },
      {
        category: 'QR Codes',
        question: 'Can I customize my QR code?',
        answer: '**Yes! QR codes can be customized!** 🎨\n\n' +
                '**Customization options:**\n' +
                '• Add your logo to the center\n' +
                '• Change colors (stay scannable!)\n' +
                '• Download in different sizes\n' +
                '• Get PNG or SVG formats\n\n' +
                '**Pro tip:** Keep good contrast between QR code and background for best scanning! High contrast = better scans! 📱',
        keywords: [
          'customize qr', 'custom qr', 'qr logo', 'qr color',
          'change qr code', 'style qr', 'branded qr',
        ],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // NFC TAGS
      // ═══════════════════════════════════════════════════════
      {
        category: 'NFC',
        question: 'How do NFC tags work?',
        answer: '**NFC tags = Tap-to-view magic!** ✨\n\n' +
                '**What is NFC?** Near Field Communication - just tap your phone to the tag and content appears instantly!\n\n' +
                '**How to set up:**\n' +
                '1. Create your Stream\n' +
                '2. Get the Stream URL from your dashboard\n' +
                '3. Write the URL to your NFC tag (use any NFC writing app)\n' +
                '4. Done! Now tapping shows your content! 📲\n\n' +
                '**Where to use NFC tags:**\n' +
                '• Business cards\n' +
                '• Plaques and memorials\n' +
                '• Product packaging\n' +
                '• Event check-ins\n' +
                '• Interactive displays\n\n' +
                '**Works on:** Most modern smartphones (iPhone XS and newer, most Android phones)',
        keywords: [
          'nfc', 'nfc tag', 'nfc tags', 'tap', 'tap to view',
          'how nfc works', 'nfc chip', 'write nfc',
        ],
        priority: 10,
      },

      // ═══════════════════════════════════════════════════════
      // ANALYTICS
      // ═══════════════════════════════════════════════════════
      {
        category: 'Analytics',
        question: 'How can I see who viewed my content?',
        answer: '**Analytics are built-in!** 📊\n\n' +
                '**View detailed analytics for:**\n' +
                '• Total views (all-time and recent)\n' +
                '• Unique visitors\n' +
                '• View sources (QR scan, NFC tap, or direct link)\n' +
                '• Geographic locations\n' +
                '• Device types (mobile, desktop, tablet)\n' +
                '• Popular content items\n' +
                '• Time and date patterns\n\n' +
                '**To access:**\n' +
                '1. Go to Dashboard → Analytics\n' +
                '2. Select a Stream to see detailed stats\n' +
                '3. Export data for reports!\n\n' +
                'Track engagement and understand your audience! 📈',
        keywords: [
          'analytics', 'views', 'statistics', 'stats', 'tracking',
          'who viewed', 'view count', 'visitors', 'engagement',
        ],
        priority: 9,
      },

      // ═══════════════════════════════════════════════════════
      // TEAM MANAGEMENT
      // ═══════════════════════════════════════════════════════
      {
        category: 'Team',
        question: 'How do I add team members?',
        answer: '**Collaborate with your team!** 👥\n\n' +
                '**To invite team members:**\n' +
                '1. Go to Dashboard → **Team**\n' +
                '2. Click **"Invite Member"**\n' +
                '3. Enter their email address\n' +
                '4. Select their role:\n' +
                '   • **Viewer** - Can view content only\n' +
                '   • **Editor** - Can create and edit Streams\n' +
                '   • **Admin** - Full access (manage team, billing)\n' +
                '5. Click **"Send Invitation"**\n\n' +
                'They\'ll receive an email to join your organization! 📧\n\n' +
                '**Team member limits:** Based on your subscription plan',
        keywords: [
          'team', 'invite', 'add member', 'team member', 'collaborate',
          'add user', 'invite user', 'team management',
        ],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // PRICING & BILLING
      // ═══════════════════════════════════════════════════════
      {
        category: 'Pricing',
        question: 'What are your pricing plans?',
        answer: '**We have plans for everyone!** 💳\n\n' +
                '**Individual** - $10/month\n' +
                '• 2GB storage\n' +
                '• Unlimited Streams\n' +
                '• QR codes & NFC support\n' +
                '• Basic analytics\n\n' +
                '**Small Organization** - $25/month\n' +
                '• 10GB storage\n' +
                '• Up to 5 team members\n' +
                '• Advanced analytics\n' +
                '• Priority support\n\n' +
                '**Medium Organization** - $50/month\n' +
                '• 50GB storage\n' +
                '• Up to 15 team members\n' +
                '• Custom branding\n' +
                '• API access\n\n' +
                '**Enterprise** - Custom pricing\n' +
                '• Unlimited storage\n' +
                '• Unlimited team members\n' +
                '• White-label solution\n' +
                '• Dedicated support\n\n' +
                '**Upgrade anytime!** Visit Account Settings → Billing 💰',
        keywords: [
          'pricing', 'price', 'cost', 'how much', 'plans',
          'subscription', 'plan options', 'what does it cost',
        ],
        priority: 9,
      },
      {
        category: 'Billing',
        question: 'How do I update my payment method?',
        answer: '**Update your payment info easily!** 💳\n\n' +
                '**Steps:**\n' +
                '1. Go to Dashboard → Account Settings\n' +
                '2. Click **"Billing"**\n' +
                '3. Click **"Update Payment Method"**\n' +
                '4. Enter your new card details\n' +
                '5. Click **"Save"**\n\n' +
                'Your subscription continues without interruption! No downtime! ✨',
        keywords: [
          'payment', 'credit card', 'update payment', 'change card',
          'billing', 'payment method', 'update card',
        ],
        priority: 9,
      },
      {
        category: 'Billing',
        question: 'How do I cancel my subscription?',
        answer: '**You can cancel anytime!** 🔓\n\n' +
                '**To cancel:**\n' +
                '1. Go to Dashboard → Account Settings\n' +
                '2. Click **"Billing"**\n' +
                '3. Click **"Cancel Subscription"**\n' +
                '4. Confirm cancellation\n\n' +
                '**Important:**\n' +
                '• You keep access until the end of your billing period\n' +
                '• Your data is safe for 30 days\n' +
                '• You can reactivate anytime!\n\n' +
                'We\'re sad to see you go, but we understand! 💙',
        keywords: [
          'cancel', 'cancel subscription', 'stop subscription',
          'end subscription', 'unsubscribe', 'cancel plan',
        ],
        priority: 9,
      },

      // ═══════════════════════════════════════════════════════
      // STORAGE
      // ═══════════════════════════════════════════════════════
      {
        category: 'Storage',
        question: 'How much storage do I get?',
        answer: '**Storage based on your plan:** 💾\n\n' +
                '**Individual:** 2GB\n' +
                '**Small Organization:** 10GB\n' +
                '**Medium Organization:** 50GB\n' +
                '**Enterprise:** Unlimited\n\n' +
                '**Check your usage:**\n' +
                'Dashboard → Account Settings → Storage\n\n' +
                '**Need more space?** Upgrade your plan anytime! 🚀',
        keywords: [
          'storage', 'space', 'how much storage', 'storage limit',
          'out of space', 'storage full', 'need more space',
        ],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // ACCOUNT MANAGEMENT
      // ═══════════════════════════════════════════════════════
      {
        category: 'Account',
        question: 'How do I reset my password?',
        answer: '**Reset your password easily!** 🔑\n\n' +
                '**Steps:**\n' +
                '1. Go to the login page\n' +
                '2. Click **"Forgot Password?"**\n' +
                '3. Enter your email address\n' +
                '4. Check your email for reset link\n' +
                '5. Click the link and set your new password\n\n' +
                '**Didn\'t receive the email?** Check your spam folder! 📧',
        keywords: [
          'password', 'reset password', 'forgot password', 'change password',
          'cant login', 'locked out', 'reset',
        ],
        priority: 9,
      },
      {
        category: 'Account',
        question: 'How do I delete my account?',
        answer: '**We\'re sad to see you go!** 😢\n\n' +
                '**To delete your account:**\n' +
                '1. Go to Dashboard → Account Settings\n' +
                '2. Scroll to **"Danger Zone"**\n' +
                '3. Click **"Delete Account"**\n' +
                '4. Confirm deletion\n\n' +
                '**⚠️ Warning:**\n' +
                '• All your content will be permanently deleted\n' +
                '• QR codes and NFC tags will stop working\n' +
                '• This action cannot be undone!\n\n' +
                'Consider downloading your content first! 💾',
        keywords: [
          'delete account', 'remove account', 'close account',
          'delete my account', 'deactivate', 'cancel account',
        ],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // TECHNICAL SUPPORT
      // ═══════════════════════════════════════════════════════
      {
        category: 'Support',
        question: 'How do I contact support?',
        answer: '**We\'re here to help!** 💬\n\n' +
                '**Contact options:**\n' +
                '• **Live Chat** - Right here! (fastest response)\n' +
                '• **Email** - support@outboundimpact.org\n' +
                '• **Help Center** - docs.outboundimpact.org\n\n' +
                '**Response times:**\n' +
                '• Live Chat - Usually instant!\n' +
                '• Email - Within 24 hours\n\n' +
                'Our support team is ready to assist you! 🌟',
        keywords: [
          'contact', 'support', 'help', 'email support',
          'contact support', 'get help', 'customer service',
        ],
        priority: 8,
      },
    ],
  });

  console.log(`✅ Added ${knowledgeBase.count} knowledge base entries!\n`);

  // ═══════════════════════════════════════════════════════════
  // INTENTS - COMMON USER GOALS
  // ═══════════════════════════════════════════════════════════

  console.log('🎯 Adding Chat Intents...');

  const intents = await prisma.chatIntent.createMany({
    data: [
      {
        name: 'greeting',
        description: 'User greets the assistant',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola', 'greetings'],
        response: 'Hello! 👋 Welcome to Outbound Impact support! I\'m here to help you with:\n\n' +
                  '• Creating Streams\n' +
                  '• Uploading content\n' +
                  '• QR codes & NFC tags\n' +
                  '• Analytics\n' +
                  '• Team management\n' +
                  '• Billing & subscriptions\n\n' +
                  'What can I help you with today? 😊',
        requiresHuman: false,
        priority: 10,
      },
      {
        name: 'thank_you',
        description: 'User says thank you',
        patterns: ['thank you', 'thanks', 'thank', 'appreciate', 'helpful', 'great', 'awesome'],
        response: 'You\'re very welcome! 😊 I\'m happy I could help!\n\n' +
                  'If you need anything else, I\'m right here. Have a wonderful day! 🌟',
        requiresHuman: false,
        priority: 8,
      },
      {
        name: 'urgent_issue',
        description: 'User has urgent issue',
        patterns: ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'right now', 'help now'],
        response: '🚨 I understand this is urgent! Let me connect you with our support team right away. They\'ll assist you immediately!',
        requiresHuman: true,
        priority: 10,
      },
      {
        name: 'billing_issue',
        description: 'User has billing problem',
        patterns: ['billing issue', 'billing problem', 'charged wrong', 'payment problem', 'subscription error', 'refund', 'cant pay', 'payment failed'],
        response: 'I see you have a billing concern. Let me connect you with our billing specialist who can review your account and help resolve this right away! 💳',
        requiresHuman: true,
        priority: 10,
      },
      {
        name: 'technical_issue',
        description: 'User reports technical error',
        patterns: ['error', 'not working', 'broken', 'bug', 'crash', 'failed', 'doesnt work', 'issue', 'problem'],
        response: 'I\'m sorry you\'re experiencing a technical issue! 😔\n\n' +
                  'Let me connect you with our technical support team who can troubleshoot and fix this for you!',
        requiresHuman: true,
        priority: 9,
      },
      {
        name: 'general_help',
        description: 'User asks for general help',
        patterns: ['help', 'need help', 'can you help', 'assist me', 'support'],
        response: 'I\'d be happy to help! 🤝\n\n' +
                  'I can assist with:\n' +
                  '📤 Uploading files\n' +
                  '🎨 Creating Streams\n' +
                  '📱 QR codes\n' +
                  '🔗 NFC tags\n' +
                  '📊 Analytics\n' +
                  '👥 Team management\n' +
                  '💳 Billing\n\n' +
                  'What would you like help with?',
        requiresHuman: false,
        priority: 9,
      },
    ],
  });

  console.log(`✅ Added ${intents.count} intents!\n`);

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEEDING COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📚 Knowledge Base: ${knowledgeBase.count} entries`);
  console.log(`🎯 Intents: ${intents.count} patterns`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🤖 Your AI chatbot is now ready to answer questions!');
  console.log('💡 Test it by asking: "How do I upload files?"\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });