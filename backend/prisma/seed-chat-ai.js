const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ULTRA COMPREHENSIVE Knowledge Base (51 FAQs)...\n');

  console.log('🗑️  Clearing existing knowledge base...');
  await prisma.chatKnowledgeBase.deleteMany({});
  await prisma.chatIntent.deleteMany({});
  console.log('✅ Cleared!\n');

  console.log('📚 Adding COMPLETE Knowledge Base with ALL Platform Features...');

  const knowledgeBase = await prisma.chatKnowledgeBase.createMany({
    data: [
      // ═══════════════════════════════════════════════════════
      // UPLOAD & CONTENT (7 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Upload',
        question: 'How do I upload files?',
        answer: 'Uploading content to Outbound Impact is easy!\n\n' +
                'Step 1: Go to your Dashboard\n' +
                'Step 2: Scroll down to "Quick Actions" section\n' +
                'Step 3: Click the "Upload New" button\n' +
                'Step 4: Select your files (images, videos, audio, documents)\n' +
                'Step 5: Optionally create a Stream during upload or add to existing Stream later\n\n' +
                'Supported formats: Images (PNG, JPG, GIF), Videos (MP4, MOV), Audio (MP3, WAV), Documents (PDF)\n' +
                'Max file size: 100MB per file\n\n' +
                'Your files are stored securely on our CDN for fast access worldwide!',
        keywords: ['upload', 'upload file', 'upload files', 'uploading', 'add file', 'add files', 'how to upload', 'upload content', 'add content', 'upload media', 'upload image', 'upload video', 'upload document', 'upload photo', 'upload new', 'add media'],
        priority: 10,
      },
      {
        category: 'Upload',
        question: 'What file types can I upload?',
        answer: 'You can upload these file types:\n\n' +
                'Images: PNG, JPG, JPEG, GIF, WebP\n' +
                'Videos: MP4, MOV, AVI, WebM\n' +
                'Audio: MP3, WAV, OGG, M4A\n' +
                'Documents: PDF, DOC, DOCX, TXT\n\n' +
                'Maximum file size: 100MB per file\n\n' +
                'All files are stored securely on our CDN for fast, reliable access worldwide!',
        keywords: ['file types', 'file format', 'supported files', 'what files', 'can i upload', 'file size', 'max size', 'maximum size', 'supported formats', 'file limits'],
        priority: 9,
      },
      {
        category: 'Upload',
        question: 'How do I add text content with call-to-action buttons?',
        answer: 'Create professional text content with CTA buttons!\n\n' +
                'Step 1: Go to Upload page\n' +
                'Step 2: Click "Text Content" option\n' +
                'Step 3: Enter your text content\n' +
                'Step 4: Add a call-to-action button (optional):\n' +
                '   • Enter button text (max 50 characters) - Example: "Learn More", "Buy Now"\n' +
                '   • Enter button URL - Where it should link to\n' +
                'Step 5: Click "Create Text Content"\n\n' +
                'Perfect for:\n' +
                '• Announcements with "Learn More" buttons\n' +
                '• Descriptions with "Buy Now" links\n' +
                '• Messages with "Contact Us" buttons\n\n' +
                'The button appears professionally styled with your text content!',
        keywords: ['text content', 'add text', 'cta button', 'call to action', 'button text', 'button url', 'add button', 'text with button', 'create text', 'action button'],
        priority: 9,
      },
      {
        category: 'Upload',
        question: 'How do I embed links from YouTube, Vimeo, Spotify, Google Drive?',
        answer: 'Embed content from popular platforms easily!\n\n' +
                'Step 1: Go to Upload page\n' +
                'Step 2: Click "Embed Link" option\n' +
                'Step 3: Paste the URL from supported platforms:\n' +
                '   • YouTube - Videos and playlists\n' +
                '   • Vimeo - Videos\n' +
                '   • SoundCloud - Tracks and playlists\n' +
                '   • Spotify - Songs, albums, playlists\n' +
                '   • Google Drive - Files and folders\n' +
                '   • Google Docs - Documents\n' +
                '   • Google Sheets - Spreadsheets\n' +
                '   • Google Slides - Presentations\n' +
                'Step 4: System auto-detects the platform\n' +
                'Step 5: Click "Create Embed"\n\n' +
                'The content will be embedded and viewable directly in your Streams!\n\n' +
                'No need to download and re-upload - just paste the link!',
        keywords: ['embed', 'embed link', 'youtube', 'vimeo', 'spotify', 'soundcloud', 'google drive', 'google docs', 'google sheets', 'google slides', 'embed video', 'embed audio', 'embed url', 'link content', 'embed content'],
        priority: 9,
      },
      {
        category: 'Upload',
        question: 'Can I create a Stream while uploading files?',
        answer: 'Yes! You can create a Stream during upload to save time!\n\n' +
                'During the upload process:\n' +
                'Step 1: Upload your files as normal\n' +
                'Step 2: Look for "Create Stream" checkbox or option\n' +
                'Step 3: Check it and give your Stream a name\n' +
                'Step 4: Your uploaded files are automatically added to the new Stream\n\n' +
                'This combines upload and Stream creation into one step!\n\n' +
                'You can also:\n' +
                '• Add to an existing Stream during upload\n' +
                '• Upload first, create Stream later\n' +
                '• Add files to Streams from My Items page',
        keywords: ['upload and create stream', 'create stream while uploading', 'upload to stream', 'stream during upload', 'upload with stream'],
        priority: 8,
      },
      {
        category: 'Upload',
        question: 'Where do my uploaded files go?',
        answer: 'All uploaded files go to your Items library!\n\n' +
                'To view them:\n' +
                'Dashboard → Quick Actions → My Items\n\n' +
                'From My Items page, you can:\n' +
                '• View all your content\n' +
                '• Add thumbnails\n' +
                '• Edit item details\n' +
                '• Add items to Streams\n' +
                '• Share individually\n' +
                '• Download items\n' +
                '• Delete items\n\n' +
                'Your items stay in your library until you manually delete them!',
        keywords: ['where files go', 'uploaded files', 'file location', 'my uploads', 'uploaded content', 'find files'],
        priority: 8,
      },
      {
        category: 'Upload',
        question: 'Can I upload the same file to multiple Streams?',
        answer: 'Yes! You can add the same item to multiple Streams!\n\n' +
                'Method 1: From My Items\n' +
                'Step 1: Go to My Items\n' +
                'Step 2: Find the item you want to add\n' +
                'Step 3: Select it and click "Add to Stream"\n' +
                'Step 4: Choose multiple Streams\n\n' +
                'Method 2: From Stream Management\n' +
                'Step 1: Go to a Stream and click "Manage"\n' +
                'Step 2: Select items from your library\n' +
                'Step 3: The same item can be in multiple Streams\n\n' +
                'This is perfect for:\n' +
                '• Using the same logo in multiple Streams\n' +
                '• Sharing content across different portfolios\n' +
                '• Reusing assets without re-uploading',
        keywords: ['same file multiple streams', 'add to multiple streams', 'reuse content', 'duplicate item', 'multiple streams'],
        priority: 7,
      },

      // ═══════════════════════════════════════════════════════
      // ITEM MANAGEMENT (5 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Items',
        question: 'How do I add a thumbnail to an item?',
        answer: 'Adding a thumbnail to your item:\n\n' +
                'Step 1: Go to Dashboard → Quick Actions → My Items\n' +
                'Step 2: Find the item you want to add a thumbnail to\n' +
                'Step 3: Click the "Edit" button (pencil icon)\n' +
                'Step 4: In the edit modal, look for "Thumbnail" section\n' +
                'Step 5: Click "Choose File" or drag and drop an image\n' +
                'Step 6: Preview appears instantly\n' +
                'Step 7: Click "Save Changes"\n\n' +
                'Thumbnail requirements:\n' +
                '• Must be an image file (PNG, JPG, GIF, WebP)\n' +
                '• Maximum size: 5MB\n' +
                '• Recommended: Square images work best (500x500px or larger)\n\n' +
                'Thumbnails appear when sharing items and in Stream previews!',
        keywords: ['thumbnail', 'add thumbnail', 'item thumbnail', 'image preview', 'preview image', 'cover image', 'item image', 'set thumbnail', 'upload thumbnail', 'change thumbnail'],
        priority: 10,
      },
      {
        category: 'Items',
        question: 'How do I edit or delete items?',
        answer: 'Managing your items is easy!\n\n' +
                'To Edit an Item:\n' +
                'Step 1: Go to Dashboard → My Items\n' +
                'Step 2: Find your item\n' +
                'Step 3: Click the "Edit" button (pencil icon)\n' +
                'Step 4: Update title, description, thumbnail, or content\n' +
                'Step 5: Click "Save Changes"\n\n' +
                'To Delete an Item:\n' +
                'Step 1: Go to Dashboard → My Items\n' +
                'Step 2: Find your item\n' +
                'Step 3: Click the "Delete" button (trash icon)\n' +
                'Step 4: Confirm deletion\n\n' +
                'Warning: Deleting an item is permanent and cannot be undone! The item will be removed from all Streams it is in.',
        keywords: ['edit item', 'delete item', 'remove item', 'modify item', 'change item', 'update item', 'manage items', 'item management'],
        priority: 9,
      },
      {
        category: 'Items',
        question: 'How do I make an item private or shareable?',
        answer: 'Control who can see your items!\n\n' +
                'Quick Toggle Method:\n' +
                'Step 1: Go to Dashboard → My Items\n' +
                'Step 2: Find your item\n' +
                'Step 3: Click the sharing toggle button\n' +
                'Step 4: Item is instantly private or shareable!\n\n' +
                'Edit Modal Method:\n' +
                'Step 1: Click "Edit" on your item\n' +
                'Step 2: Toggle "Sharing Enabled"\n' +
                'Step 3: Save changes\n\n' +
                'Status Indicators:\n' +
                '• Shareable (Green): Item can be viewed by anyone with the link\n' +
                '• Private (Red): Item is only visible to you and your team\n\n' +
                'Perfect for controlling access to sensitive content!',
        keywords: ['private', 'sharing', 'make private', 'make public', 'share item', 'sharing enabled', 'disable sharing', 'item visibility', 'who can see', 'privacy'],
        priority: 9,
      },
      {
        category: 'Items',
        question: 'Where can I see all my uploaded items?',
        answer: 'View all your items in one central location!\n\n' +
                'Step 1: Go to your Dashboard\n' +
                'Step 2: Scroll to "Quick Actions" section\n' +
                'Step 3: Click "My Items"\n\n' +
                'On the My Items page you can:\n' +
                '• View all uploaded content (images, videos, audio, documents, text, embeds)\n' +
                '• Search and filter items\n' +
                '• Edit item details and thumbnails\n' +
                '• Delete items\n' +
                '• Toggle sharing on/off\n' +
                '• See which Streams each item belongs to\n' +
                '• Download or share individual items\n' +
                '• Sort by date, name, or type\n\n' +
                'Your items are organized with the newest first by default!',
        keywords: ['my items', 'view items', 'see items', 'all items', 'item library', 'content library', 'uploaded files', 'where are my files', 'find items'],
        priority: 9,
      },
      {
        category: 'Items',
        question: 'Can I share individual items without creating a Stream?',
        answer: 'Yes! Every item gets its own unique shareable link!\n\n' +
                'Step 1: Go to My Items\n' +
                'Step 2: Find the item you want to share\n' +
                'Step 3: Click the "Share" or "View" button\n' +
                'Step 4: Copy the item link (format: /l/item-slug)\n' +
                'Step 5: Share via email, messaging, or social media\n\n' +
                'Each individual item can be:\n' +
                '• Shared independently via its own link\n' +
                '• Embedded in websites\n' +
                '• Sent via email or messaging apps\n' +
                '• Viewed without needing a Stream\n\n' +
                'You do not need to create a Stream to share individual items!',
        keywords: ['share item', 'individual item', 'item link', 'share single item', 'item url', 'single item share'],
        priority: 8,
      },

// PART 1 ENDS HERE - Continue in PART 2
      // ═══════════════════════════════════════════════════════
      {
        category: 'Streams',
        question: 'How do I create a Stream?',
        answer: 'Creating a Stream is simple!\n\n' +
                'Method 1: From Dashboard Quick Actions\n' +
                'Step 1: Scroll down in your Dashboard\n' +
                'Step 2: Find "Quick Actions" section\n' +
                'Step 3: Click the "Streams" button\n' +
                'Step 4: You will be redirected to the Streams page\n' +
                'Step 5: Click "Create Stream" button\n' +
                'Step 6: Give your Stream a name and description\n' +
                'Step 7: Click "Save"\n\n' +
                'Method 2: During Content Upload\n' +
                'You can create a Stream while uploading files - just check the "Create Stream" option!\n\n' +
                'What are Streams? Collections of your content that people can access by scanning a QR code or tapping an NFC tag!',
        keywords: ['create stream', 'new stream', 'make stream', 'create campaign', 'how to create', 'stream', 'streams', 'campaign', 'campaigns', 'create collection', 'new campaign', 'make a stream', 'build stream'],
        priority: 10,
      },
      {
        category: 'Streams',
        question: 'How do I add content to a Stream?',
        answer: 'Adding content to your Stream:\n\n' +
                'Step 1: Go to Dashboard → Quick Actions → Streams\n' +
                'Step 2: Find your Stream in the list\n' +
                'Step 3: Click the "Manage" button on your Stream\n' +
                'Step 4: Select content items from your library\n' +
                'Step 5: Click "Add to Stream"\n\n' +
                'You can also:\n' +
                '• Add content during the upload process\n' +
                '• Add the same item to multiple Streams\n' +
                '• Rearrange items by dragging and dropping\n\n' +
                'Changes appear instantly to anyone viewing your Stream!',
        keywords: ['add content', 'add to stream', 'manage stream', 'add items', 'add files to stream', 'stream content', 'manage button', 'add photos', 'add videos'],
        priority: 10,
      },
      {
        category: 'Streams',
        question: 'How do I password-protect a Stream?',
        answer: 'Protect your Streams with a password for private access!\n\n' +
                'Step 1: Go to Streams page\n' +
                'Step 2: Find your Stream\n' +
                'Step 3: Click "Edit" or settings icon\n' +
                'Step 4: Look for "Password Protection" option\n' +
                'Step 5: Toggle it ON\n' +
                'Step 6: Enter a password (simple and easy to share)\n' +
                'Step 7: Save changes\n\n' +
                'Password Best Practices:\n' +
                '• Choose simple passwords like "family2024" or "members"\n' +
                '• Easy to share verbally, via email, or announcements\n' +
                '• Visitors need the password to view Stream content\n' +
                '• Password is remembered in browser for convenience\n\n' +
                'Perfect for:\n' +
                '• Private family events\n' +
                '• Member-only content\n' +
                '• Client galleries\n' +
                '• Internal company materials',
        keywords: ['password', 'password protect', 'stream password', 'protect stream', 'password protection', 'private stream', 'secure stream', 'password protected'],
        priority: 9,
      },
      {
        category: 'Streams',
        question: 'What is a Stream?',
        answer: 'A Stream is a collection of your content!\n\n' +
                'Think of it like a digital album or portfolio. You can add:\n' +
                '• Images and photos\n' +
                '• Videos\n' +
                '• Audio files\n' +
                '• Text and descriptions\n' +
                '• Documents\n' +
                '• Embedded content (YouTube, Spotify, etc.)\n\n' +
                'Each Stream gets:\n' +
                '• Its own unique URL\n' +
                '• QR code for easy sharing\n' +
                '• NFC tag link for tap-to-view\n' +
                '• Analytics tracking\n\n' +
                'Popular uses:\n' +
                '• Memorial services (photos, videos, tributes)\n' +
                '• Portfolios (showcase your work)\n' +
                '• Menus (restaurant or event menus)\n' +
                '• Product catalogs\n' +
                '• Event programs\n' +
                '• Business presentations',
        keywords: ['what is stream', 'stream', 'streams', 'what is campaign', 'campaign', 'campaigns', 'collection', 'portfolio', 'what are streams', 'stream meaning'],
        priority: 10,
      },
      {
        category: 'Streams',
        question: 'Can I edit a Stream after creating it?',
        answer: 'Yes! You can edit Streams anytime without breaking links!\n\n' +
                'To edit a Stream:\n' +
                'Step 1: Go to Streams page (Dashboard → Quick Actions → Streams)\n' +
                'Step 2: Find the Stream you want to edit\n' +
                'Step 3: Click "Edit" or the settings icon\n' +
                'Step 4: Make your changes:\n' +
                '   • Add or remove content\n' +
                '   • Update name and description\n' +
                '   • Change password protection\n' +
                '   • Modify custom URL slug\n' +
                'Step 5: Click "Save"\n\n' +
                'Important: Your QR code and NFC tag stay the same! Updates appear instantly to anyone viewing your Stream - no need to regenerate codes!',
        keywords: ['edit stream', 'modify stream', 'change stream', 'update stream', 'edit campaign', 'modify campaign', 'change content', 'update content', 'edit collection'],
        priority: 9,
      },
      {
        category: 'Streams',
        question: 'How do I preview my Stream before sharing?',
        answer: 'Preview your Stream exactly as visitors will see it!\n\n' +
                'Step 1: Go to Streams page\n' +
                'Step 2: Find your Stream\n' +
                'Step 3: Click the "Preview" button or eye icon\n\n' +
                'Preview mode opens your Stream URL with ?preview=true parameter.\n\n' +
                'In preview mode, check:\n' +
                '• Content layout and order\n' +
                '• Images and videos display correctly\n' +
                '• Password protection works (if enabled)\n' +
                '• Mobile responsiveness\n' +
                '• Links and buttons function properly\n' +
                '• Embedded content loads correctly\n\n' +
                'Make adjustments before sharing your QR code or NFC tag with the public!',
        keywords: ['preview stream', 'preview mode', 'test stream', 'view stream', 'stream preview', 'preview before sharing'],
        priority: 8,
      },
      {
        category: 'Streams',
        question: 'Can I customize my Stream URL?',
        answer: 'Yes! Each Stream gets a custom slug (short, friendly URL)!\n\n' +
                'Stream URLs look like:\n' +
                'outboundimpact.org/c/your-custom-slug\n\n' +
                'To customize your slug:\n' +
                'Step 1: Edit your Stream\n' +
                'Step 2: Look for "Custom Slug" or "URL" field\n' +
                'Step 3: Enter your desired slug:\n' +
                '   • Use letters, numbers, and hyphens\n' +
                '   • Keep it short and memorable\n' +
                '   • Make it relevant to your content\n' +
                'Step 4: Save changes\n\n' +
                'Benefits of custom slugs:\n' +
                '• Easier to remember and share verbally\n' +
                '• More professional looking\n' +
                '• Great for branding\n' +
                '• SEO friendly\n\n' +
                'Examples:\n' +
                '• outboundimpact.org/c/johns-portfolio\n' +
                '• outboundimpact.org/c/wedding-2024\n' +
                '• outboundimpact.org/c/product-catalog',
        keywords: ['custom url', 'stream url', 'slug', 'custom slug', 'stream link', 'url customization', 'custom link'],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // QR CODES & NFC (4 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'QR Codes',
        question: 'How do I create a QR code?',
        answer: 'Creating QR codes is instant and easy!\n\n' +
                'Step 1: Create a Stream with your content\n' +
                'Step 2: On the Streams page, find your Stream\n' +
                'Step 3: Click "Generate QR Code" button\n' +
                'Step 4: Download your QR code:\n' +
                '   • PNG format - For digital use and printing\n' +
                '   • SVG format - For high-quality scaling\n' +
                'Step 5: Share it anywhere - print, digital, social media!\n\n' +
                'Your QR code:\n' +
                '• Works forever (never expires!)\n' +
                '• Can be reprinted anytime\n' +
                '• Updates automatically when you edit your Stream\n' +
                '• Tracks scans and analytics\n' +
                '• Works on any QR code scanner\n\n' +
                'Perfect for: Business cards, posters, flyers, packaging, signs, and more!',
        keywords: ['qr code', 'qr', 'create qr', 'generate qr', 'make qr code', 'qr code generator', 'download qr', 'get qr code', 'qr code create'],
        priority: 10,
      },
      {
        category: 'QR Codes',
        question: 'Can I customize my QR code design?',
        answer: 'Yes! QR codes can be customized while staying scannable!\n\n' +
                'Customization options:\n' +
                '• Add your logo to the center (recommended size: 100x100px)\n' +
                '• Change foreground and background colors\n' +
                '• Download in different sizes (small, medium, large)\n' +
                '• Get PNG or SVG formats\n' +
                '• Adjust error correction level\n\n' +
                'Important Tips:\n' +
                '• Keep high contrast between QR code and background\n' +
                '• Dark colors on light background work best\n' +
                '• Test your QR code after customization\n' +
                '• Logo should not cover more than 30% of QR code\n\n' +
                'Pro tip: A simple black and white QR code always scans best!',
        keywords: ['customize qr', 'custom qr', 'qr logo', 'qr color', 'change qr code', 'style qr', 'branded qr', 'qr design'],
        priority: 8,
      },
      {
        category: 'QR Codes',
        question: 'What is the best way to print QR codes?',
        answer: 'Best practices for printing QR codes:\n\n' +
                'Size Guidelines:\n' +
                '• Minimum size: 2cm x 2cm (0.8" x 0.8")\n' +
                '• Recommended: 3-4cm (1.2-1.6") for easy scanning\n' +
                '• Business cards: 2.5cm works well\n' +
                '• Posters: 5-10cm for distance scanning\n\n' +
                'Quality Tips:\n' +
                '• Use high resolution (300 DPI minimum)\n' +
                '• Download SVG for perfect scaling\n' +
                '• Use PNG at large size for printing\n' +
                '• Ensure high contrast (black on white is best)\n\n' +
                'Testing:\n' +
                '• Print a test copy first\n' +
                '• Scan with multiple phones\n' +
                '• Check from different distances\n' +
                '• Verify in different lighting\n\n' +
                'Materials:\n' +
                '• Matte finish reduces glare\n' +
                '• Avoid glossy surfaces\n' +
                '• Weatherproof for outdoor use',
        keywords: ['print qr code', 'qr printing', 'qr size', 'qr quality', 'print qr', 'qr resolution'],
        priority: 7,
      },
      {
        category: 'NFC',
        question: 'How do NFC tags work?',
        answer: 'NFC tags = Tap-to-view magic!\n\n' +
                'What is NFC? Near Field Communication - just tap your phone to the tag and content appears instantly!\n\n' +
                'Setup Instructions:\n' +
                'Step 1: Create your Stream\n' +
                'Step 2: Get the Stream URL from your dashboard\n' +
                'Step 3: Write the URL to your NFC tag using an NFC writing app:\n' +
                '   • iPhone: Use apps like "NFC Tools" or "NFC TagWriter"\n' +
                '   • Android: Use "NFC Tools" or "Trigger"\n' +
                'Step 4: Done! Tapping the tag now opens your Stream!\n\n' +
                'Benefits:\n' +
                '• Instant access (under 1 second)\n' +
                '• Works in the dark (no camera needed)\n' +
                '• No app required on user phone\n' +
                '• Professional user experience\n' +
                '• Rewritable (can update URL anytime)\n\n' +
                'Perfect for:\n' +
                '• Business cards\n' +
                '• Plaques and memorials\n' +
                '• Product packaging\n' +
                '• Event check-ins\n' +
                '• Interactive displays\n' +
                '• Smart posters\n\n' +
                'Compatible with: Most modern smartphones (iPhone XS and newer, most Android phones)',
        keywords: ['nfc', 'nfc tag', 'nfc tags', 'tap', 'tap to view', 'how nfc works', 'nfc chip', 'write nfc', 'near field', 'tap phone'],
        priority: 10,
      },

      // ═══════════════════════════════════════════════════════
      // SHARING & SOCIAL (5 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Sharing',
        question: 'How do I share my Stream on social media?',
        answer: 'Share your Streams on social media platforms!\n\n' +
                'When viewing a Stream, look for social sharing buttons:\n\n' +
                'Twitter:\n' +
                '• Click the Twitter button\n' +
                '• Pre-filled tweet with your Stream link\n' +
                '• Customize message and post\n\n' +
                'Facebook:\n' +
                '• Click the Facebook button\n' +
                '• Share to timeline or in messages\n' +
                '• Add your own comment\n\n' +
                'LinkedIn:\n' +
                '• Click the LinkedIn button\n' +
                '• Share with your professional network\n' +
                '• Add context for your connections\n\n' +
                'WhatsApp:\n' +
                '• Click the WhatsApp button\n' +
                '• Select contacts or groups\n' +
                '• Message sent with Stream link\n\n' +
                'Perfect for promoting your portfolio, events, or business!',
        keywords: ['social media', 'share social', 'twitter', 'facebook', 'linkedin', 'social sharing', 'share stream social'],
        priority: 8,
      },
      {
        category: 'Sharing',
        question: 'How do I share via email or WhatsApp?',
        answer: 'Share your Streams directly via email or messaging!\n\n' +
                'Email Sharing:\n' +
                'Step 1: View your Stream\n' +
                'Step 2: Click the "Email" share button\n' +
                'Step 3: Your email client opens with:\n' +
                '   • Pre-filled subject line\n' +
                '   • Stream link in the body\n' +
                '   • Description of content\n' +
                'Step 4: Add recipients and send!\n\n' +
                'WhatsApp Sharing:\n' +
                'Step 1: Click the WhatsApp button\n' +
                'Step 2: Choose contacts or groups\n' +
                'Step 3: Message is sent with Stream link\n\n' +
                'Manual Sharing:\n' +
                '• Copy the Stream URL\n' +
                '• Paste in any email or messaging app\n' +
                '• Add your own message\n\n' +
                'The link works on any device and requires no login!',
        keywords: ['email', 'email share', 'whatsapp', 'share email', 'share whatsapp', 'messaging', 'send link'],
        priority: 8,
      },
      {
        category: 'Sharing',
        question: 'Can visitors download content from my Stream?',
        answer: 'Yes! Visitors can download content if you allow it!\n\n' +
                'How it works:\n' +
                '• Images: Visitors can view and download\n' +
                '• Videos: Can be viewed in browser\n' +
                '• Documents: Can be downloaded (PDFs, etc.)\n' +
                '• Audio: Can be played and downloaded\n\n' +
                'To control downloads:\n' +
                'Step 1: Edit your Stream\n' +
                'Step 2: Look for download settings\n' +
                'Step 3: Enable or disable download buttons\n\n' +
                'Privacy Options:\n' +
                '• Allow downloads: Visitors can save content\n' +
                '• View only: Content can be seen but not easily downloaded\n' +
                '• Password protected: Only people with password can access\n\n' +
                'Note: Making items "Private" in My Items prevents sharing entirely.',
        keywords: ['download', 'download content', 'visitors download', 'save content', 'download items'],
        priority: 7,
      },
      {
        category: 'Sharing',
        question: 'How do I get the direct link to my Stream?',
        answer: 'Get your Stream link easily for sharing!\n\n' +
                'Method 1: From Streams Page\n' +
                'Step 1: Go to Streams page\n' +
                'Step 2: Find your Stream\n' +
                'Step 3: Look for the URL displayed:\n' +
                '   Format: outboundimpact.org/c/your-slug\n' +
                'Step 4: Click "Copy Link" button\n\n' +
                'Method 2: From Stream View\n' +
                'Step 1: Click "View" or "Preview" on your Stream\n' +
                'Step 2: Copy the URL from your browser address bar\n\n' +
                'Method 3: From QR Code\n' +
                'Step 1: Generate QR code\n' +
                'Step 2: The link is shown below the QR code\n\n' +
                'Share this link:\n' +
                '• Via email\n' +
                '• In social media\n' +
                '• On your website\n' +
                '• In messaging apps\n' +
                '• On business cards (as text or QR)',
        keywords: ['stream link', 'get link', 'copy link', 'stream url', 'direct link', 'share link'],
        priority: 8,
      },
      {
        category: 'Sharing',
        question: 'Can I embed my Stream on my website?',
        answer: 'Yes! You can embed Streams on your website!\n\n' +
                'Embedding Options:\n\n' +
                'Option 1: Direct Link\n' +
                '• Link to your Stream URL\n' +
                '• Example: <a href="outboundimpact.org/c/your-stream">View Gallery</a>\n\n' +
                'Option 2: iFrame Embed (if supported)\n' +
                '• Get embed code from Stream settings\n' +
                '• Paste into your website HTML\n' +
                '• Stream displays within your page\n\n' +
                'Option 3: Button with QR Code\n' +
                '• Download QR code image\n' +
                '• Add to your website with "Scan to View" text\n' +
                '• Visitors scan with their phones\n\n' +
                'Best Practices:\n' +
                '• Use password protection if needed\n' +
                '• Ensure mobile responsiveness\n' +
                '• Test on different devices\n' +
                '• Update Stream content without changing link',
        keywords: ['embed', 'embed stream', 'website embed', 'iframe', 'embed on website'],
        priority: 7,
      },

// PART 2 ENDS HERE - Continue in PART 3
      // ═══════════════════════════════════════════════════════
      {
        category: 'Analytics',
        question: 'How can I see who viewed my content?',
        answer: 'Analytics are built-in to track engagement!\n\n' +
                'View detailed analytics for:\n' +
                '• Total views (all-time and recent)\n' +
                '• Unique visitors\n' +
                '• View sources (QR scan, NFC tap, or direct link)\n' +
                '• Geographic locations\n' +
                '• Device types (mobile, desktop, tablet)\n' +
                '• Popular content items\n' +
                '• Time and date patterns\n\n' +
                'To access analytics:\n' +
                'Step 1: Go to Dashboard → Quick Actions\n' +
                'Step 2: Click "Analytics"\n' +
                'Step 3: Select a Stream to see detailed stats\n' +
                'Step 4: View charts and graphs\n' +
                'Step 5: Export data for reports (Organization plans)\n\n' +
                'Track engagement and understand your audience!',
        keywords: ['analytics', 'views', 'statistics', 'stats', 'tracking', 'who viewed', 'view count', 'visitors', 'engagement', 'analytics dashboard', 'track views', 'see views'],
        priority: 9,
      },
      {
        category: 'Analytics',
        question: 'What are Advanced Analytics features?',
        answer: 'Advanced Analytics for Organization Plans!\n\n' +
                'Available for: Small Organization, Medium Organization, and Enterprise plans\n\n' +
                'Advanced features include:\n' +
                '• Real-time view tracking\n' +
                '• Detailed visitor demographics\n' +
                '• Heatmaps showing popular content\n' +
                '• Engagement time metrics\n' +
                '• Click-through rates on CTAs\n' +
                '• Export to CSV/Excel/PDF\n' +
                '• Custom date ranges\n' +
                '• Multi-stream comparisons\n' +
                '• Hourly/daily/monthly breakdowns\n' +
                '• Referral source tracking\n' +
                '• Geographic mapping\n\n' +
                'To access:\n' +
                'Dashboard → Quick Actions → Advanced Analytics\n\n' +
                'Individual plan includes basic analytics with total views, sources, and devices.',
        keywords: ['advanced analytics', 'detailed analytics', 'organization analytics', 'analytics features', 'pro analytics', 'premium analytics', 'enterprise analytics', 'export analytics'],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // TEAM MANAGEMENT (2 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Team',
        question: 'How do I add team members?',
        answer: 'Collaborate with your team easily!\n\n' +
                'To invite team members:\n' +
                'Step 1: Go to your Dashboard\n' +
                'Step 2: Look for the "Team Members" card (shows current member count)\n' +
                'Step 3: Click "Manage Team"\n' +
                'Step 4: Click "Invite Member"\n' +
                'Step 5: Enter their email address\n' +
                'Step 6: Select their role:\n' +
                '   • Viewer - Can view content only\n' +
                '   • Editor - Can create and edit Streams\n' +
                '   • Admin - Full access (manage team, billing)\n' +
                'Step 7: Click "Send Invitation"\n\n' +
                'They will receive an email invitation to join your organization!\n\n' +
                'Team member limits by plan:\n' +
                '• Small Organization: Up to 5 team members\n' +
                '• Medium Organization: Up to 20 team members\n' +
                '• Enterprise: 50+ team members (customizable up to unlimited)',
        keywords: ['team', 'invite', 'add member', 'team member', 'collaborate', 'add user', 'invite user', 'team management', 'add team', 'invite team member', 'team invite'],
        priority: 9,
      },
      {
        category: 'Team',
        question: 'What are team member roles and permissions?',
        answer: 'Team Member Roles Explained:\n\n' +
                'Viewer Role:\n' +
                '• Can view all Streams and content\n' +
                '• Can see analytics\n' +
                '• Cannot upload or create Streams\n' +
                '• Cannot edit or delete content\n' +
                '• Cannot manage team members\n' +
                '• Perfect for: Clients, stakeholders, read-only access\n\n' +
                'Editor Role:\n' +
                '• Everything Viewer can do PLUS:\n' +
                '• Can upload new content\n' +
                '• Can create and edit Streams\n' +
                '• Can manage content items\n' +
                '• Can add/remove items from Streams\n' +
                '• Cannot manage team members or billing\n' +
                '• Perfect for: Content creators, designers, collaborators\n\n' +
                'Admin Role:\n' +
                '• Everything Editor can do PLUS:\n' +
                '• Can manage team members (invite, remove, change roles)\n' +
                '• Can manage billing and subscription\n' +
                '• Full organization access\n' +
                '• Can delete items and Streams\n' +
                '• Perfect for: Managers, owners, decision-makers\n\n' +
                'Choose roles based on trust level and job responsibilities!',
        keywords: ['team roles', 'viewer', 'editor', 'admin', 'permissions', 'role permissions', 'what can viewer do', 'what can editor do', 'team permissions', 'role access', 'user roles'],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // PRICING (1 FAQ) - CORRECTED
      // ═══════════════════════════════════════════════════════
      {
        category: 'Pricing',
        question: 'What are your pricing plans and features?',
        answer: 'We have plans for everyone - from individuals to large enterprises!\n\n' +
                '💎 Individual - $85 for 12 months\n' +
                '• 250GB storage\n' +
                '• Unlimited Streams\n' +
                '• Unlimited QR codes\n' +
                '• NFC support\n' +
                '• Basic analytics\n' +
                '• Unlimited views\n' +
                '• Can cancel anytime - access ends immediately\n' +
                '• Renews annually at $85/year\n\n' +
                '👥 Small Organization - $35/month\n' +
                '• 250GB storage\n' +
                '• Up to 5 team members\n' +
                '• Stream creation\n' +
                '• Advanced analytics\n' +
                '• Priority support\n' +
                '• Team collaboration\n\n' +
                '🏢 Medium Organization - $60/month\n' +
                '• 500GB storage\n' +
                '• Up to 20 team members\n' +
                '• Custom branding\n' +
                '• Export reports (CSV/PDF)\n' +
                '• Dedicated support\n' +
                '• Advanced team features\n\n' +
                '🚀 Enterprise - Starting at $99/month (Fully Customizable)\n' +
                '• Base: 1.5TB storage, 50 team members\n' +
                '• Storage add-ons: 2TB (+$50), 3TB (+$150), 5TB (+$350), 10TB (+$850)\n' +
                '• Team add-ons: 100 (+$30), 250 (+$120), 500 (+$270), 1000 (+$570), Unlimited (+$150)\n' +
                '• White-label solution\n' +
                '• API access\n' +
                '• Custom integrations\n' +
                '• 2FA security\n' +
                '• Dedicated account manager\n\n' +
                'Upgrade or cancel anytime! Visit: Dashboard → Settings → Plans & Billing',
        keywords: ['pricing', 'price', 'cost', 'how much', 'plans', 'subscription', 'plan options', 'what does it cost', 'pricing plans', 'monthly cost', 'annual cost', 'yearly', 'how much does it cost', 'plan cost'],
        priority: 10,
      },

      // ═══════════════════════════════════════════════════════
      // BILLING (5 FAQs) - CORRECTED
      // ═══════════════════════════════════════════════════════
      {
        category: 'Billing',
        question: 'How do I update my payment method?',
        answer: 'Update your payment information easily!\n\n' +
                'Steps to update payment:\n' +
                'Step 1: Go to your Dashboard\n' +
                'Step 2: Click your profile icon → Settings\n' +
                'Step 3: Navigate to "Billing" section\n' +
                'Step 4: Click "Update Payment Method"\n' +
                'Step 5: Enter your new card details:\n' +
                '   • Card number\n' +
                '   • Expiration date\n' +
                '   • CVV/CVC code\n' +
                '   • Billing zip code\n' +
                'Step 6: Click "Save" or "Update"\n\n' +
                'Your subscription continues without interruption!\n\n' +
                'Security: All payment information is processed securely through Stripe. We never store your full card details.',
        keywords: ['payment', 'credit card', 'update payment', 'change card', 'billing', 'payment method', 'update card', 'change payment', 'new card', 'update billing'],
        priority: 9,
      },
      {
        category: 'Billing',
        question: 'How do I upgrade or change my plan?',
        answer: 'Upgrading or changing plans is simple!\n\n' +
                'Steps to change plan:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Click "Plans & Billing"\n' +
                'Step 3: View all available plans\n' +
                'Step 4: Click "Upgrade" or "Change Plan" on your desired plan\n' +
                'Step 5: Review the changes and pricing\n' +
                'Step 6: Confirm the change\n\n' +
                'Important details:\n' +
                '• Changes take effect immediately\n' +
                '• You are charged the prorated difference for current billing period\n' +
                '• Storage and team limits update instantly\n' +
                '• No downtime during the switch\n\n' +
                'Popular upgrades:\n' +
                '• Individual ($85/year) → Small Org ($35/month) for team features\n' +
                '• Small Org → Medium Org ($60/month) for more storage and team members\n' +
                '• Medium Org → Enterprise (from $99/month) for white-label and API access\n\n' +
                'You can also downgrade - changes apply at next billing cycle to avoid losing access.',
        keywords: ['upgrade', 'upgrade plan', 'change plan', 'switch plan', 'get more storage', 'upgrade subscription', 'better plan', 'upgrade to enterprise', 'downgrade', 'switch subscription'],
        priority: 9,
      },
      {
        category: 'Billing',
        question: 'How do I cancel my subscription?',
        answer: 'You can cancel your subscription anytime!\n\n' +
                'To cancel your subscription:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Click "Billing" section\n' +
                'Step 3: Scroll to "Subscription Management"\n' +
                'Step 4: Click "Cancel Subscription"\n' +
                'Step 5: Confirm cancellation\n\n' +
                'Important information:\n' +
                '• Individual Plan: Access ends IMMEDIATELY upon cancellation\n' +
                '• Organization Plans: You keep access until the end of your current billing period\n' +
                '• Your data is safe for 30 days after cancellation\n' +
                '• You can reactivate anytime within 30 days\n' +
                '• Canceling within 7 days: Full refund available (see refund policy)\n' +
                '• Canceling after 7 days: No refund, but Organization plan access continues until period ends\n\n' +
                '⚠️ CRITICAL WARNING: Do NOT delete your account if you want a refund! Use the "Cancel Subscription" option instead. Deleting your account is permanent and you will lose all data.',
        keywords: ['cancel', 'cancel subscription', 'stop subscription', 'end subscription', 'unsubscribe', 'cancel plan', 'stop billing', 'cancel account', 'cancel membership'],
        priority: 9,
      },
      {
        category: 'Billing',
        question: 'How do I apply a coupon or discount code?',
        answer: 'Apply discount codes easily during signup!\n\n' +
                'During Plan Selection:\n' +
                'Step 1: On the Plans page, select your desired plan\n' +
                'Step 2: Look for "Have a coupon?" link or button\n' +
                'Step 3: Click it to open the coupon modal\n' +
                'Step 4: Enter your coupon code\n' +
                'Step 5: Click "Apply"\n' +
                'Step 6: Discount appears immediately!\n' +
                'Step 7: Complete checkout with discounted price\n\n' +
                'Types of coupons:\n' +
                '• Percentage discounts (e.g., 20% off, 50% off)\n' +
                '• Fixed amount discounts (e.g., $10 off, $25 off)\n' +
                '• First month/year free\n' +
                '• Limited time promotional offers\n\n' +
                'Important notes:\n' +
                '• Coupons are applied per plan at checkout\n' +
                '• Coupons are validated before payment\n' +
                '• Some coupons may have expiration dates\n' +
                '• Cannot combine multiple coupons\n\n' +
                'Get coupons from:\n' +
                '• Email promotions\n' +
                '• Social media campaigns\n' +
                '• Partner offers\n' +
                '• Special events',
        keywords: ['coupon', 'discount', 'promo code', 'discount code', 'coupon code', 'apply coupon', 'have a coupon', 'promotional code', 'discount offer', 'promo'],
        priority: 8,
      },
      {
        category: 'Billing',
        question: 'What is your 7-day refund policy?',
        answer: 'We offer a 7-day money-back guarantee!\n\n' +
                'Refund Eligibility:\n' +
                '• Full refund if you cancel within 7 days of first subscription\n' +
                '• Applies to ALL plans (Individual, Small Org, Medium Org, Enterprise)\n' +
                '• No questions asked\n\n' +
                'How to request a refund:\n' +
                'Step 1: Go to Dashboard → Settings → Billing\n' +
                'Step 2: Look for "7-Day Refund Policy" section\n' +
                'Step 3: Check your eligibility status (shows days remaining)\n' +
                'Step 4: Click "Request Refund"\n' +
                'Step 5: Provide a reason (minimum 10 characters)\n' +
                'Step 6: Confirm your request\n\n' +
                'What happens after requesting refund:\n' +
                '• Immediate refund processed to your original payment method\n' +
                '• Account is cancelled and data deleted\n' +
                '• All Streams and content permanently removed\n' +
                '• Refund appears in 5-10 business days\n\n' +
                'Important:\n' +
                '• After 7 days, refunds are not available\n' +
                '• You can still cancel to avoid future charges\n' +
                '• Download your data before requesting refund\n\n' +
                '⚠️ WARNING: Do NOT manually delete your account - use the refund request feature!',
        keywords: ['refund', '7 day refund', 'money back', 'refund policy', '7 day policy', 'money back guarantee', 'get refund', 'request refund', '7-day'],
        priority: 9,
      },

      // ═══════════════════════════════════════════════════════
      // STORAGE (1 FAQ)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Storage',
        question: 'How much storage do I get with each plan?',
        answer: 'Storage limits based on your plan:\n\n' +
                '💎 Individual Plan:\n' +
                '• 250GB storage (250,000 MB)\n' +
                '• Enough for thousands of photos and videos\n' +
                '• $85 for 12 months\n\n' +
                '👥 Small Organization Plan:\n' +
                '• 250GB storage (250,000 MB)\n' +
                '• Shared among up to 5 team members\n\n' +
                '🏢 Medium Organization Plan:\n' +
                '• 500GB storage (500,000 MB)\n' +
                '• Shared among up to 20 team members\n\n' +
                '🚀 Enterprise Plan:\n' +
                '• Base: 1.5TB storage (1,500GB / 1,500,000 MB)\n' +
                '• Upgradeable options:\n' +
                '   - 2TB (+$50/month)\n' +
                '   - 3TB (+$150/month)\n' +
                '   - 5TB (+$350/month)\n' +
                '   - 10TB (+$850/month)\n\n' +
                'Check your current usage:\n' +
                '• Dashboard: See storage bar showing percentage used\n' +
                '• Settings → Storage: View detailed breakdown\n\n' +
                'What counts toward storage:\n' +
                '• Uploaded images, videos, audio files\n' +
                '• Documents and PDFs\n' +
                '• Item thumbnails\n\n' +
                'What does NOT count:\n' +
                '• Embedded content (YouTube, Spotify, Google Drive)\n' +
                '• Text-only content\n' +
                '• QR codes\n\n' +
                'Need more space? Upgrade your plan anytime in Settings → Plans & Billing!',
        keywords: ['storage', 'space', 'how much storage', 'storage limit', 'out of space', 'storage full', 'need more space', 'storage quota', 'disk space', 'gb', 'gigabyte', 'storage size'],
        priority: 9,
      },

// PART 3 ENDS HERE - Continue in PART 4
      // ═══════════════════════════════════════════════════════
      {
        category: 'Account',
        question: 'How do I reset my password?',
        answer: 'Reset your password easily!\n\n' +
                'Steps to reset password:\n' +
                'Step 1: Go to the login page (outboundimpact.org/signin)\n' +
                'Step 2: Click "Forgot Password?" link\n' +
                'Step 3: Enter your email address\n' +
                'Step 4: Click "Send Reset Link"\n' +
                'Step 5: Check your email inbox\n' +
                'Step 6: Click the password reset link in the email\n' +
                'Step 7: Enter your new password (twice to confirm)\n' +
                'Step 8: Click "Reset Password"\n\n' +
                'Did not receive the email?\n' +
                '• Check your spam/junk folder\n' +
                '• Verify you entered the correct email address\n' +
                '• Wait a few minutes and check again\n' +
                '• Try requesting another reset link\n' +
                '• Contact support if still not received\n\n' +
                'Important notes:\n' +
                '• Reset links expire after 1 hour for security\n' +
                '• Password must be at least 8 characters\n' +
                '• Use a mix of letters and numbers\n' +
                '• Avoid common passwords',
        keywords: ['password', 'reset password', 'forgot password', 'change password', 'cant login', 'locked out', 'reset', 'forgot my password', 'password reset', 'lost password'],
        priority: 9,
      },
      {
        category: 'Account',
        question: 'How do I change my email address?',
        answer: 'Change your account email address:\n\n' +
                'Steps to change email:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Find "Account Information" or "Profile" section\n' +
                'Step 3: Click "Edit" next to your email address\n' +
                'Step 4: Enter your new email address\n' +
                'Step 5: Enter your current password to verify\n' +
                'Step 6: Click "Save" or "Update Email"\n\n' +
                'Email Verification:\n' +
                '• You will receive a verification email at your NEW address\n' +
                '• Click the verification link in the email\n' +
                '• Your email is updated after verification\n' +
                '• Old email will receive a notification of the change\n\n' +
                'Important:\n' +
                '• Use a valid email you have access to\n' +
                '• This email is used for login and important notifications\n' +
                '• Verification link expires after 24 hours\n' +
                '• Cannot use an email already registered in the system',
        keywords: ['change email', 'update email', 'new email', 'email address', 'switch email', 'change login email', 'update account email'],
        priority: 8,
      },
      {
        category: 'Account',
        question: 'How do I upload or change my profile picture?',
        answer: 'Update your profile picture to personalize your account!\n\n' +
                'Steps to upload profile picture:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Find "Profile Information" section\n' +
                'Step 3: Look for your current profile picture (or placeholder)\n' +
                'Step 4: Click "Upload New Picture" or click on the picture itself\n' +
                'Step 5: Select an image from your device\n' +
                'Step 6: Image preview appears\n' +
                'Step 7: Adjust/crop if needed\n' +
                'Step 8: Click "Save" or "Update Profile"\n\n' +
                'Profile picture requirements:\n' +
                '• Image files only (PNG, JPG, JPEG, GIF)\n' +
                '• Recommended: Square images (500x500px minimum)\n' +
                '• Maximum file size: 5MB\n' +
                '• Avoid low-resolution or blurry images\n\n' +
                'Your profile picture appears:\n' +
                '• In the dashboard header\n' +
                '• In team member lists\n' +
                '• On comments and activity logs\n' +
                '• In chat support (if applicable)\n\n' +
                'Make it professional and recognizable to your team!',
        keywords: ['profile picture', 'avatar', 'profile photo', 'upload picture', 'change picture', 'profile image', 'update picture', 'add photo', 'change avatar'],
        priority: 8,
      },
      {
        category: 'Account',
        question: 'How do I enable or disable auto-renewal for my subscription?',
        answer: 'Control your subscription auto-renewal settings!\n\n' +
                'Steps to manage auto-renewal:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Click "Billing" section\n' +
                'Step 3: Find "Subscription Management"\n' +
                'Step 4: Look for "Auto-Renewal" toggle switch\n' +
                'Step 5: Toggle it ON or OFF\n' +
                'Step 6: Confirm your choice\n\n' +
                'Auto-Renewal ENABLED:\n' +
                '• Subscription automatically renews each billing cycle\n' +
                '• No interruption in service\n' +
                '• Payment charged automatically to saved card\n' +
                '• Convenient and hassle-free\n' +
                '• Ensures continuous access\n\n' +
                'Auto-Renewal DISABLED:\n' +
                '• Subscription ends at current billing period\n' +
                '• You will need to manually renew\n' +
                '• Access continues until period ends\n' +
                '• No automatic charges\n' +
                '• You will receive reminder emails before expiration\n\n' +
                'Note: Individual plan ($85/year) has annual auto-renewal. Toggle it OFF if you do not want automatic renewal next year.',
        keywords: ['auto renewal', 'auto renew', 'automatic renewal', 'subscription renewal', 'disable auto renewal', 'turn off renewal', 'stop auto renew', 'recurring payment'],
        priority: 8,
      },
      {
        category: 'Account',
        question: 'How do I delete my account?',
        answer: 'We are sad to see you go! Here is how to delete your account.\n\n' +
                '⚠️ CRITICAL - READ BEFORE DELETING:\n' +
                '• If you want a REFUND, use "Cancel Subscription" instead (not delete account)\n' +
                '• Deleting your account is PERMANENT and CANNOT be undone\n' +
                '• ALL data will be LOST FOREVER\n' +
                '• QR codes and NFC tags will STOP WORKING immediately\n\n' +
                'Steps to delete account:\n' +
                'Step 1: Go to Dashboard → Settings\n' +
                'Step 2: Scroll to "Danger Zone" at the bottom\n' +
                'Step 3: Click "Delete Account"\n' +
                'Step 4: Confirm by typing your email address\n' +
                'Step 5: Click final "Delete My Account" button\n\n' +
                'What gets permanently deleted:\n' +
                '• All your content (images, videos, documents, files)\n' +
                '• All Streams and campaigns\n' +
                '• All QR codes stop working\n' +
                '• All NFC tags stop working\n' +
                '• Analytics and usage data\n' +
                '• Team member access\n' +
                '• Your account profile\n\n' +
                'BEFORE deleting, consider:\n' +
                '• Download important content first\n' +
                '• Cancel subscription if you just want to stop billing\n' +
                '• Contact support if you have concerns or issues\n' +
                '• Export your data and analytics\n\n' +
                'Alternatives to deleting:\n' +
                '• Cancel Subscription: Keeps data for 30 days, eligible for refund\n' +
                '• Downgrade Plan: Keep account but reduce costs',
        keywords: ['delete account', 'remove account', 'close account', 'delete my account', 'deactivate', 'cancel account', 'remove data', 'delete everything', 'close my account'],
        priority: 8,
      },

      // ═══════════════════════════════════════════════════════
      // ENTERPRISE FEATURES (5 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Enterprise',
        question: 'What features are included in the Enterprise plan?',
        answer: 'Enterprise Plan - Premium Features for Growing Businesses!\n\n' +
                '🎨 White Label Branding:\n' +
                '• Custom brand colors (primary, secondary, accent)\n' +
                '• Remove "Powered by Outbound Impact" branding\n' +
                '• Custom domain (yourcompany.com)\n' +
                '• Custom email templates\n' +
                '• Branded footer text\n\n' +
                '🔌 API Access:\n' +
                '• Full REST API for integrations\n' +
                '• Generate and manage API keys\n' +
                '• Webhook support for real-time events\n' +
                '• Rate limiting controls\n' +
                '• Complete API documentation\n\n' +
                '🔒 Advanced Security:\n' +
                '• Two-factor authentication (2FA)\n' +
                '• Advanced security settings\n' +
                '• Audit logs for compliance\n' +
                '• SSO options (Single Sign-On)\n' +
                '• IP whitelisting\n\n' +
                '🔗 Integrations:\n' +
                '• Connect with external platforms\n' +
                '• Custom integration support\n' +
                '• Zapier integration\n' +
                '• Webhook notifications\n\n' +
                '📊 Advanced Analytics:\n' +
                '• Real-time dashboards\n' +
                '• Custom reports and exports\n' +
                '• Advanced filtering and segmentation\n' +
                '• Data visualization tools\n\n' +
                '💼 Scalable Pricing:\n' +
                '• Base: $99/month (1.5TB storage, 50 team members)\n' +
                '• Add more storage: 2TB to 10TB available\n' +
                '• Add more team members: 100 to unlimited\n' +
                '• Custom enterprise packages available\n\n' +
                'Access Enterprise Features: Dashboard → Quick Actions → Enterprise Settings',
        keywords: ['enterprise', 'enterprise features', 'white label', 'api', 'api access', '2fa', 'two factor', 'integrations', 'advanced features', 'premium features', 'enterprise plan'],
        priority: 8,
      },
      {
        category: 'Enterprise',
        question: 'How do I customize my brand colors with White Label?',
        answer: 'White Label - Make Outbound Impact YOUR Brand!\n\n' +
                'Available for: Enterprise plan only\n\n' +
                'Steps to customize brand colors:\n' +
                'Step 1: Go to Dashboard → Enterprise Features\n' +
                'Step 2: Click "White Label Settings"\n' +
                'Step 3: Find "Brand Colors" section\n' +
                'Step 4: Customize your colors:\n' +
                '   • Primary Color: Main brand color (buttons, headers)\n' +
                '   • Secondary Color: Accent color (links, highlights)\n' +
                '   • Accent Color: Additional color for emphasis\n' +
                'Step 5: Use the color picker or enter hex codes (e.g., #FF5733)\n' +
                'Step 6: Preview changes in real-time\n' +
                'Step 7: Click "Save Settings"\n\n' +
                'What gets branded with your colors:\n' +
                '• Dashboard interface and navigation\n' +
                '• Public Stream viewer pages\n' +
                '• Email notifications and templates\n' +
                '• QR code accent colors (optional)\n' +
                '• Login and signup pages\n\n' +
                'Customize Footer Text:\n' +
                '• Change "Powered by Outbound Impact" text\n' +
                '• Add your company name\n' +
                '• Or remove it completely for full white-label\n\n' +
                'Additional Options:\n' +
                '• Upload your logo\n' +
                '• Set favicon for browser tabs\n' +
                '• Customize button styles\n\n' +
                'Your brand, your way!',
        keywords: ['white label', 'brand colors', 'custom colors', 'customize brand', 'branding', 'primary color', 'secondary color', 'brand customization', 'company colors'],
        priority: 7,
      },
      {
        category: 'Enterprise',
        question: 'How do I set up a custom domain for White Label?',
        answer: 'Custom Domain Setup - Use YOUR Domain!\n\n' +
                'Available for: Enterprise plan only\n\n' +
                'Steps to set up custom domain:\n' +
                'Step 1: Go to Dashboard → Enterprise Features\n' +
                'Step 2: Click "White Label Settings"\n' +
                'Step 3: Find "Custom Domain" section\n' +
                'Step 4: Enter your desired domain:\n' +
                '   Examples: content.yourcompany.com, share.yourbrand.com\n' +
                'Step 5: Click "Save"\n' +
                'Step 6: Follow the DNS configuration instructions provided\n\n' +
                'DNS Configuration:\n' +
                'Step 1: Log in to your domain registrar (GoDaddy, Namecheap, etc.)\n' +
                'Step 2: Find DNS settings for your domain\n' +
                'Step 3: Add a CNAME record:\n' +
                '   • Host/Name: your subdomain (e.g., "content" or "share")\n' +
                '   • Points to: [provided Outbound Impact URL]\n' +
                '   • TTL: 3600 (or automatic)\n' +
                'Step 4: Save DNS changes\n' +
                'Step 5: Wait for DNS propagation (5 minutes to 48 hours)\n' +
                'Step 6: Return to Outbound Impact and click "Verify Domain"\n\n' +
                'After successful setup:\n' +
                '• Your Streams appear on YOUR domain\n' +
                '• No Outbound Impact branding in the URL\n' +
                '• Professional appearance for clients\n' +
                '• Full brand control\n' +
                '• SSL certificate automatically applied\n\n' +
                'Example transformation:\n' +
                'Before: outboundimpact.org/c/portfolio\n' +
                'After: content.yourcompany.com/portfolio\n\n' +
                'Need help? Contact our support team for DNS setup assistance!',
        keywords: ['custom domain', 'domain', 'white label domain', 'custom url', 'own domain', 'dns', 'cname', 'domain setup'],
        priority: 7,
      },
      {
        category: 'Enterprise',
        question: 'How do I generate and manage API keys?',
        answer: 'API Access for Developers - Build Custom Integrations!\n\n' +
                'Available for: Enterprise plan only\n\n' +
                'Generate a New API Key:\n' +
                'Step 1: Go to Dashboard → Enterprise Features\n' +
                'Step 2: Click "API Access"\n' +
                'Step 3: Click "Generate New Key" button\n' +
                'Step 4: Enter a descriptive name for the key:\n' +
                '   Examples: "Production API", "Mobile App", "Website Integration"\n' +
                'Step 5: Click "Generate"\n' +
                'Step 6: COPY THE KEY IMMEDIATELY - you will not see it again!\n' +
                'Step 7: Store it securely\n\n' +
                'Manage Existing API Keys:\n' +
                '• View all active keys with their names\n' +
                '• See creation date and last used timestamp\n' +
                '• Revoke keys that are no longer needed\n' +
                '• Generate multiple keys for different applications\n' +
                '• Track API usage and limits\n\n' +
                'What you can do with the API:\n' +
                '• Upload content programmatically\n' +
                '• Create and manage Streams\n' +
                '• Update items and metadata\n' +
                '• Access analytics data\n' +
                '• Generate QR codes\n' +
                '• Manage team members\n' +
                '• Full CRUD operations\n\n' +
                'Security Best Practices:\n' +
                '• Keep API keys secure and confidential\n' +
                '• NEVER share keys publicly\n' +
                '• Do NOT commit keys to version control (Git)\n' +
                '• Revoke compromised keys immediately\n' +
                '• Use environment variables for storage\n' +
                '• Rotate keys periodically\n\n' +
                'Rate Limits:\n' +
                '• Based on your Enterprise plan tier\n' +
                '• Contact support for higher limits\n\n' +
                'API Documentation:\n' +
                '• Full documentation available in Dashboard → API Access\n' +
                '• Example code in multiple languages\n' +
                '• Interactive API explorer',
        keywords: ['api', 'api key', 'api keys', 'generate api key', 'api access', 'api management', 'developer api', 'rest api', 'api token'],
        priority: 7,
      },
      {
        category: 'Enterprise',
        question: 'How do I enable Two-Factor Authentication (2FA)?',
        answer: 'Enable 2FA for Enhanced Account Security!\n\n' +
                'Available for: Enterprise plan only\n\n' +
                'Steps to Enable 2FA:\n' +
                'Step 1: Go to Dashboard → Enterprise Features\n' +
                'Step 2: Click "Security & 2FA"\n' +
                'Step 3: Find "Two-Factor Authentication" section\n' +
                'Step 4: Click "Enable 2FA"\n' +
                'Step 5: System sends verification code to your email\n' +
                'Step 6: Check your email inbox\n' +
                'Step 7: Enter the 6-digit verification code\n' +
                'Step 8: Click "Verify" to activate 2FA\n\n' +
                '2FA is now enabled! ✅\n\n' +
                'How 2FA Works:\n' +
                '• Step 1: Enter email and password as usual\n' +
                '• Step 2: Receive 6-digit code via email\n' +
                '• Step 3: Enter the code to complete login\n' +
                '• Extra security layer protects your account\n\n' +
                'Benefits of 2FA:\n' +
                '• Protects against unauthorized access\n' +
                '• Prevents password-only breaches\n' +
                '• Adds verification step for logins\n' +
                '• Required for compliance in some industries\n' +
                '• Peace of mind for sensitive data\n\n' +
                'To Disable 2FA:\n' +
                'Step 1: Go to Dashboard → Security & 2FA\n' +
                'Step 2: Click "Disable 2FA"\n' +
                'Step 3: Confirm your decision\n\n' +
                'Troubleshooting:\n' +
                '• Did not receive code? Check spam folder\n' +
                '• Code expired? Click "Resend Code"\n' +
                '• Lost access to email? Contact support immediately\n\n' +
                'Protect your account and data with 2FA!',
        keywords: ['2fa', 'two factor', 'two factor authentication', 'enable 2fa', 'security', 'authentication', 'two step', '2-factor', 'verification code'],
        priority: 7,
      },

      // ═══════════════════════════════════════════════════════
      // SUPPORT (2 FAQs)
      // ═══════════════════════════════════════════════════════
      {
        category: 'Support',
        question: 'How do I contact support?',
        answer: 'We are here to help you!\n\n' +
                'Contact Support Options:\n\n' +
                '💬 Live Chat (Fastest!):\n' +
                '• Click the chat icon in the bottom right\n' +
                '• Available right here - you are already using it!\n' +
                '• Usually instant response during business hours\n\n' +
                '📧 Email Support:\n' +
                '• support@outboundimpact.org\n' +
                '• We respond within 24 hours\n' +
                '• Include your account email for faster help\n\n' +
                '📚 Help Center:\n' +
                '• Visit Dashboard → User Guide\n' +
                '• Comprehensive tutorials and guides\n' +
                '• Video walkthroughs\n' +
                '• FAQ section\n\n' +
                'Response Times by Plan:\n' +
                '• Individual: Within 24 hours (email)\n' +
                '• Small/Medium Organization: Within 12 hours (Priority Support)\n' +
                '• Enterprise: Within 4 hours (Dedicated Support)\n\n' +
                'What to include in your support message:\n' +
                '• Clear description of the issue\n' +
                '• Steps to reproduce the problem (if applicable)\n' +
                '• Screenshots if helpful\n' +
                '• Your account email address\n' +
                '• Browser and device information (if technical issue)\n\n' +
                'Our support team is ready to assist you with any questions or issues!',
        keywords: ['contact', 'support', 'help', 'email support', 'contact support', 'get help', 'customer service', 'support team', 'contact us', 'need help', 'assistance'],
        priority: 9,
      },
      {
        category: 'Support',
        question: 'Is there a user guide or documentation?',
        answer: 'Yes! We have comprehensive documentation!\n\n' +
                'Access the User Guide:\n' +
                'Step 1: Go to your Dashboard\n' +
                'Step 2: Look for "User Guide" in the sidebar menu\n' +
                'Step 3: Or click your profile icon → User Guide\n\n' +
                'What the User Guide includes:\n\n' +
                '🎯 Getting Started:\n' +
                '• Complete onboarding walkthrough\n' +
                '• First-time setup instructions\n' +
                '• Quick start tutorials\n\n' +
                '📖 Feature Documentation:\n' +
                '• How to upload content\n' +
                '• Creating and managing Streams\n' +
                '• QR code and NFC setup\n' +
                '• Team collaboration\n' +
                '• Analytics and reporting\n\n' +
                '🎥 Video Tutorials:\n' +
                '• Step-by-step video guides\n' +
                '• Visual demonstrations\n' +
                '• Best practices and tips\n\n' +
                '💡 Best Practices:\n' +
                '• Optimization tips\n' +
                '• Use case examples\n' +
                '• Common workflows\n' +
                '• Industry-specific guidance\n\n' +
                '❓ FAQ Section:\n' +
                '• Common questions and answers\n' +
                '• Troubleshooting guides\n' +
                '• Quick reference\n\n' +
                '🔧 Troubleshooting:\n' +
                '• Common issues and solutions\n' +
                '• Error messages explained\n' +
                '• Debug tips\n\n' +
                'The User Guide is:\n' +
                '• Always up-to-date with latest features\n' +
                '• Searchable for quick answers\n' +
                '• Mobile-friendly\n' +
                '• Available 24/7\n\n' +
                'Perfect for new users learning the platform and advanced users exploring features!',
        keywords: ['user guide', 'guide', 'tutorial', 'help guide', 'how to use', 'instructions', 'documentation', 'learn', 'walkthrough', 'help docs', 'manual'],
        priority: 8,
      },
    ],
  });

  console.log(`✅ Added ${knowledgeBase.count} knowledge base entries!\n`);

  // ═══════════════════════════════════════════════════════════
  // INTENTS (6 patterns)
  // ═══════════════════════════════════════════════════════════

  console.log('🎯 Adding Chat Intents...');

  const intents = await prisma.chatIntent.createMany({
    data: [
      {
        name: 'greeting',
        description: 'User greets the assistant',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola', 'greetings', 'howdy', 'sup'],
        response: 'Hello! 👋 Welcome to Outbound Impact support!\n\n' +
                  'I can help you with:\n' +
                  '• Creating Streams and adding content\n' +
                  '• Uploading files, text, embedded links, and CTA buttons\n' +
                  '• Managing items and thumbnails\n' +
                  '• QR codes & NFC tags\n' +
                  '• Password protection and privacy\n' +
                  '• Social sharing and downloads\n' +
                  '• Analytics and tracking\n' +
                  '• Team management\n' +
                  '• Billing, coupons, refunds, and plans\n' +
                  '• Enterprise features (White Label, API, 2FA)\n\n' +
                  'What can I help you with today?',
        requiresHuman: false,
        priority: 10,
      },
      {
        name: 'thank_you',
        description: 'User says thank you',
        patterns: ['thank you', 'thanks', 'thank', 'appreciate', 'helpful', 'great', 'awesome', 'perfect', 'amazing'],
        response: 'You are very welcome! 😊\n\n' +
                  'I am happy I could help!\n\n' +
                  'If you need anything else, I am right here. Have a wonderful day! 🌟',
        requiresHuman: false,
        priority: 8,
      },
      {
        name: 'urgent_issue',
        description: 'User has urgent issue',
        patterns: ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'right now', 'help now', 'crisis'],
        response: '🚨 I understand this is urgent!\n\n' +
                  'Let me connect you with our support team right away. They will assist you immediately!',
        requiresHuman: true,
        priority: 10,
      },
      {
        name: 'billing_issue',
        description: 'User has billing problem',
        patterns: ['billing issue', 'billing problem', 'charged wrong', 'payment problem', 'subscription error', 'refund', 'cant pay', 'payment failed', 'charged twice'],
        response: 'I see you have a billing concern.\n\n' +
                  'Let me connect you with our billing specialist who can review your account and help resolve this right away! 💳',
        requiresHuman: true,
        priority: 10,
      },
      {
        name: 'technical_issue',
        description: 'User reports technical error',
        patterns: ['error', 'not working', 'broken', 'bug', 'crash', 'failed', 'doesnt work', 'issue', 'problem', 'glitch'],
        response: 'I am sorry you are experiencing a technical issue! 😔\n\n' +
                  'Let me connect you with our technical support team who can troubleshoot and fix this for you!',
        requiresHuman: true,
        priority: 9,
      },
      {
        name: 'general_help',
        description: 'User asks for general help',
        patterns: ['help', 'need help', 'can you help', 'assist me', 'support', 'guidance'],
        response: 'I would be happy to help! 🤝\n\n' +
                  'I can assist with:\n' +
                  '• Uploading files and creating content\n' +
                  '• Text with CTA buttons and embedded links\n' +
                  '• Creating and managing Streams\n' +
                  '• Adding thumbnails to items\n' +
                  '• QR codes & NFC tags\n' +
                  '• Password protection\n' +
                  '• Social sharing and downloads\n' +
                  '• Analytics\n' +
                  '• Team management\n' +
                  '• Billing, coupons, and refunds\n' +
                  '• Enterprise features (White Label, API, 2FA)\n\n' +
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
  console.log('✅ ULTRA COMPREHENSIVE KNOWLEDGE BASE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📚 Knowledge Base: ${knowledgeBase.count} COMPREHENSIVE FAQs`);
  console.log(`🎯 Intents: ${intents.count} patterns`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📦 COMPLETE COVERAGE:');
  console.log('   • Upload & Content (7 FAQs)');
  console.log('   • Item Management (5 FAQs)');
  console.log('   • Streams (7 FAQs)');
  console.log('   • QR & NFC (4 FAQs)');
  console.log('   • Sharing & Social (5 FAQs)');
  console.log('   • Analytics (2 FAQs)');
  console.log('   • Team Management (2 FAQs)');
  console.log('   • Pricing (1 FAQ)');
  console.log('   • Billing (5 FAQs)');
  console.log('   • Storage (1 FAQ)');
  console.log('   • Account & Settings (5 FAQs)');
  console.log('   • Enterprise (5 FAQs)');
  console.log('   • Support (2 FAQs)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💰 VERIFIED PRICING:');
  console.log('   Individual: $85/year (250GB, 12 months)');
  console.log('   Small Org: $35/month (250GB, 5 users)');
  console.log('   Medium Org: $60/month (500GB, 20 users)');
  console.log('   Enterprise: $99+/month (1.5TB+, 50+ users)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎯 100% PLATFORM COVERAGE ACHIEVED!');
  console.log('🤖 AI is now an EXPERT on Outbound Impact!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
