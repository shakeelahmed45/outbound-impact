import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, BookOpen, Upload, QrCode, Share2, BarChart,
  Users, Settings, HelpCircle, Zap, Shield, Send,
  Mail, Phone, Clock, CheckCircle, MessageSquare,
  ChevronDown, ChevronRight, FileText, Globe
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Guide categories
  const categories = [
    { id: 'all', label: 'All Topics', icon: BookOpen },
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'content', label: 'Content & Uploads', icon: Upload },
    { id: 'sharing', label: 'Sharing & QR/NFC', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'teams', label: 'Teams & Roles', icon: Users },
    { id: 'billing', label: 'Billing & Refunds', icon: Settings },
    { id: 'plans', label: 'Plans & Pricing', icon: Zap },
    { id: 'enterprise', label: 'Enterprise', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Shield },
  ];

  // FAQ data — COMPREHENSIVE A-Z (Updated March 2026)
  const faqs = [
    // ── GETTING STARTED ──
    { id: 1, category: 'getting-started', question: 'How do I get started with Outbound Impact?', answer: 'Visit outboundimpact.net/plans, choose a plan, create your account, and complete payment via Stripe. You\'ll land on your Dashboard. Click "Upload" to add your first content (images, videos, audio, documents, or embed links). Each upload automatically gets a QR code and shareable link.' },
    { id: 2, category: 'getting-started', question: 'Do viewers need to download an app?', answer: 'No! Viewers just scan the QR code or tap the NFC tag and the content opens directly in their phone\'s browser. No app download required.' },
    { id: 3, category: 'getting-started', question: 'What\'s the difference between Streams and Campaigns?', answer: 'They\'re the same feature with different names. Personal plans (Single Use, Life Events) call them "Streams." Organization plans (Org Events, Starter, Growth, Pro, Enterprise) call them "Campaigns." Both let you group multiple content items into a shareable collection with its own QR code.' },
    { id: 4, category: 'getting-started', question: 'What\'s the difference between individual items and Streams/Campaigns?', answer: 'Individual items are single pieces of content (one image, video, text post, or embed) — each gets its own link and QR code. Streams/Campaigns are collections that group multiple items together, like a playlist or album, with one shared QR code.' },

    // ── CONTENT & UPLOADS ──
    { id: 5, category: 'content', question: 'What types of content can I upload?', answer: 'Images (PNG, JPG, JPEG, GIF, WebP), videos (MP4, MOV, AVI, WebM), audio (MP3, WAV, OGG, M4A), documents (PDF, DOC, DOCX, TXT), text posts with CTA buttons (Visit Website, Learn More, Contact Us, Buy Now), and embed links from YouTube, YouTube Shorts, Vimeo, SoundCloud, Spotify, Google Drive, Google Docs, Google Sheets, and Google Slides.' },
    { id: 6, category: 'content', question: 'How many files can I upload?', answer: 'All plans have unlimited uploads. The only constraint is your storage limit (25 GB to 1.5 TB+ depending on plan). You can purchase additional storage packs without changing your plan: 50 GB ($4.99), 100 GB ($8.99), or 200 GB ($14.99).' },
    { id: 7, category: 'content', question: 'Can I edit media before uploading?', answer: 'Yes! The built-in Media Editor lets you edit photos (crop, rotate, brightness/contrast adjustments), trim videos (set start/end points with preview), and trim audio (with waveform visualization) — all before uploading.' },
    { id: 8, category: 'content', question: 'What are CTA buttons in text uploads?', answer: 'When creating a text content post, you can add Call-to-Action buttons like "Visit Website", "Learn More", "Contact Us", or "Buy Now" with a custom URL. Viewers see the text with clickable action buttons.' },
    { id: 9, category: 'content', question: 'How do embedded links work?', answer: 'Paste any YouTube, Vimeo, SoundCloud, Spotify, or Google Drive/Docs/Sheets/Slides URL into the embed upload. It auto-converts to an embedded player that viewers can watch/listen to directly without leaving the page. YouTube Shorts URLs are also supported.' },
    { id: 10, category: 'content', question: 'Can I add custom thumbnails?', answer: 'Yes! You can add custom thumbnails (PNG, JPG, GIF, WebP, max 5 MB) to any uploaded item. Thumbnails appear in your dashboard, campaign viewers, and shared links for a professional look.' },

    // ── SHARING & QR/NFC ──
    { id: 11, category: 'sharing', question: 'How do QR codes work?', answer: 'Every item and every Stream/Campaign gets a unique QR code automatically. Download it as a high-resolution PNG, print it on any physical material (posters, cards, packaging, signage), and anyone who scans it sees your content instantly. Every scan is tracked with device, location, and time data.' },
    { id: 12, category: 'sharing', question: 'What is NFC and how do I use it?', answer: 'NFC (Near Field Communication) lets people access your content by tapping their phone on an NFC tag — no scanning needed. You can write your content URL to NFC tags directly from the app. Compatible with all NFC-enabled smartphones. Great for interactive displays, business cards, and product packaging.' },
    { id: 13, category: 'sharing', question: 'Can I password-protect my content?', answer: 'Yes! When creating a Stream/Campaign, enable password protection. The QR code stays physically public — anyone can scan it — but viewers must enter the password before accessing the content. Perfect for exclusive content, members-only materials, internal documents, or client presentations.' },
    { id: 14, category: 'sharing', question: 'What social platforms can I share to?', answer: 'Share to Facebook, Twitter/X, LinkedIn, WhatsApp, Instagram, and Email. Organization plans also get the Amplify feature — share to multiple platforms in one tap. On mobile, native share is also available.' },
    { id: 15, category: 'sharing', question: 'What is the Amplify feature?', answer: 'Amplify (available on organization plans) lets you share content to multiple social platforms (Facebook, LinkedIn, WhatsApp, X, Instagram, Email) in one tap. Each platform opens pre-filled with your OI link. No API keys or permissions needed.' },

    // ── ANALYTICS ──
    { id: 16, category: 'analytics', question: 'How do I track views and engagement?', answer: 'All content is automatically tracked — no setup needed. Visit Analytics from the sidebar to see total views, unique visitors, device types, browsers, geographic data (country/city), time-of-day patterns, and source type (QR scan vs NFC tap vs direct link). Each Stream/Campaign also has its own analytics.' },
    { id: 17, category: 'analytics', question: 'What\'s the difference between Basic and Advanced Analytics?', answer: 'Basic Analytics (Personal Single Use, Life Events) shows total views, views by source, device types, and browsers. Advanced Analytics (Org Events, Growth, Pro, Enterprise) adds geographic data, time patterns, view trends, campaign comparisons, and data exports (CSV, PDF).' },
    { id: 18, category: 'analytics', question: 'What is the Activity Feed?', answer: 'The Activity Feed (Org Events, Starter, Growth, Pro, Enterprise) is a real-time chronological log of all scans and views. Filter by date, campaign, or device type. It shows exactly who scanned what, when, and from where.' },
    { id: 19, category: 'analytics', question: 'Can I export analytics data?', answer: 'Yes! Advanced Analytics plans (Org Events, Growth, Pro, Enterprise) can export data in CSV and PDF formats for reporting and analysis.' },

    // ── TEAMS & ROLES ──
    { id: 20, category: 'teams', question: 'Can I invite team members?', answer: 'Yes! Organization plan owners can invite team members from the Contributors page. Enter their email, select a role (Admin, Editor, or Viewer), and choose which features they can access. They\'ll receive an email invitation to join.' },
    { id: 21, category: 'teams', question: 'What are the team member roles?', answer: 'Admin — Full access to everything including billing, team management, and all features. Editor — Can create, edit, upload content and manage campaigns, but cannot manage billing or team. Viewer — Can only view content and analytics, cannot upload, edit, or delete anything.' },
    { id: 22, category: 'teams', question: 'Can I control what features team members see?', answer: 'Yes! When inviting a Viewer or Editor, you can select exactly which features they can access (uploads, items, streams, analytics, activity, messages, etc.). Admins always have full access. Existing team members with no restrictions keep full access for backward compatibility.' },
    { id: 23, category: 'teams', question: 'Can a Viewer request more access?', answer: 'Yes! Viewers can request a role upgrade (to Editor or Admin) from their dashboard. The organization owner sees pending requests on the Contributors page and can approve or dismiss them.' },

    // ── BILLING & REFUNDS ──
    { id: 24, category: 'billing', question: 'How do I manage my subscription?', answer: 'Go to Settings → Billing & Account. You\'ll see your current plan, status, storage usage, auto-renewal toggle, billing portal (to update payment method and view invoices), and cancel subscription button. All plans — including Personal Single Use and Org Events — have full billing management.' },
    { id: 25, category: 'billing', question: 'What is the 7-day refund policy?', answer: 'ALL plans are eligible for a full refund within 7 days of subscribing. Go to Settings → Billing & Account → Cancel Subscription. The refund processes automatically within 5–10 business days. IMPORTANT: Do NOT delete your account — that forfeits the refund. Always use "Cancel Subscription" instead.' },
    { id: 26, category: 'billing', question: 'What happens after I cancel?', answer: 'Within 7 days of subscribing: Full refund + immediate cancellation. After 7 days: Cancellation only (no refund), but you keep access until the end of your billing period. You can reactivate anytime from Settings → Billing & Account.' },
    { id: 27, category: 'billing', question: 'How do coupon codes work?', answer: 'On the Plans page, every plan card has a "Have a coupon code?" button. Click it, enter your code, and the discount applies at checkout. Coupons can be percentage or fixed-amount discounts.' },
    { id: 28, category: 'billing', question: 'Can I buy more storage without changing plans?', answer: 'Yes! Purchase storage add-on packs anytime: 50 GB ($4.99), 100 GB ($8.99), or 200 GB ($14.99). Available from the Storage Alert banner or Settings page. Your plan stays the same — you just get more storage.' },

    // ── PLANS & PRICING ──
    { id: 29, category: 'plans', question: 'What plans are available?', answer: 'Personal: Single Use ($69 first year, $10/yr renewal — 1 stream, 25 GB) and Life Events ($15/month — 10 streams, 100 GB). Organization: Org Events ($199 first year, $65/yr renewal — 80 campaigns, 250 GB), Starter ($49/month — 20 campaigns, 100 GB), Growth ($69/month — 30 campaigns, 250 GB), Pro ($99/month — 50 campaigns, 500 GB), Enterprise (custom pricing — unlimited, 1.5 TB+).' },
    { id: 30, category: 'plans', question: 'How does the Personal Single Use renewal work?', answer: 'You pay $69 for the first year. Before it expires, you\'ll receive email reminders at 30 days and 7 days. To continue viewing access, renew for $10/year. If not renewed within 7 days after expiry, your account is suspended (data preserved). The $10 renewal only extends access — no additional storage or features.' },
    { id: 31, category: 'plans', question: 'How does the Org Events renewal work?', answer: 'Same as Personal Single Use: $199 first year, then $65/year for renewal. Email reminders at 30 and 7 days before expiry. Suspension 7 days after expiry if unpaid. Renewal only extends access.' },
    { id: 32, category: 'plans', question: 'What happens when my annual plan expires?', answer: 'You receive email reminders at 30 days and 7 days before expiry. After expiry, you have 7 days to renew. If not renewed, your account is suspended but your data is preserved — you can reactivate by paying the renewal fee.' },
    { id: 33, category: 'plans', question: 'Is there a free trial?', answer: 'We don\'t offer a free trial, but all plans have a 7-day money-back guarantee. Try any plan risk-free — if it\'s not right for you, cancel within 7 days for a full refund.' },

    // ── ENTERPRISE ──
    { id: 34, category: 'enterprise', question: 'What is the Enterprise plan?', answer: 'Enterprise is for organizations with 5,000+ members. It includes unlimited campaigns, 1.5 TB+ storage, all features (Cohorts, Workflows, Organizations, Audit Log, Compliance, Security), SLA guarantees, dedicated support, and white-label options. Click "Contact Us" on the Plans page to get custom pricing.' },
    { id: 35, category: 'enterprise', question: 'What are Cohorts?', answer: 'Cohorts (Growth, Pro, Enterprise) are audience groups/segments. Create cohorts, add members individually or import in bulk, and assign specific campaigns to them. Track engagement per cohort for targeted content distribution.' },
    { id: 36, category: 'enterprise', question: 'What are Workflows?', answer: 'Workflows (Pro, Enterprise) are automated task sequences. Create workflows with triggers and actions to automate content distribution and management. Statuses: Draft, Active, Paused, Completed.' },
    { id: 37, category: 'enterprise', question: 'What is the Audit Log?', answer: 'The Audit Log (Pro, Enterprise) provides a complete trail of all actions — who did what, when. Filter by user, action type, or date range. Essential for compliance and accountability.' },

    // ── DATA & PRIVACY ──
    { id: 38, category: 'data', question: 'What data does Outbound Impact collect?', answer: 'User information (name, email, profile photo), organization details (company name, industry, team size), QR code data (name, destination URL, generated image), scan analytics (time, location from IP, device type, browser), messages/communications, and billing data (plan type, last 4 digits of card — full payment tokens stored in Stripe only, never on our servers).' },
    { id: 39, category: 'data', question: 'How is my data stored and secured?', answer: 'All connections are encrypted (HTTPS/TLS). Passwords are hashed with bcrypt. Payment data is handled by Stripe (PCI Level 1 certified) and never stored on our servers. Data is stored in secure PostgreSQL databases. We follow GDPR compliance practices.' },
    { id: 40, category: 'data', question: 'How does data flow through the system?', answer: 'User enters data via form or dashboard → Client-side JavaScript validates format, required fields, and length → Backend double-checks all validations for security → Data is processed, sanitized, and formatted → Stored securely in the PostgreSQL database → Confirmation returned to user. Multiple validation layers ensure only clean, properly formatted data reaches storage.' },
    { id: 41, category: 'data', question: 'How is scan analytics data collected?', answer: 'Automatically when someone scans a QR code or taps an NFC tag. We record the timestamp (UTC), geographic location (city/country derived from IP address), device type (auto-detected from user agent), browser, operating system, and source type (QR, NFC, or direct link). No personal data is collected from the scanner.' },
    { id: 42, category: 'data', question: 'Is my payment information safe?', answer: 'Absolutely. We use Stripe for payment processing, which is PCI Level 1 certified — the highest level of security certification. Your card details go directly to Stripe and are never stored on our servers. We only see the last 4 digits of your card.' },

    // ── MISC/SUPPORT ──
    { id: 43, category: 'getting-started', question: 'How do push notifications work?', answer: 'Viewers can opt-in to receive browser push notifications for specific campaigns. When new content is added, subscribers get notified automatically. Works on desktop and mobile browsers. Available on all organization plans.' },
    { id: 44, category: 'getting-started', question: 'How do I contact support?', answer: 'Use the AI chat widget (bottom-right corner of every page) for instant 24/7 help. For complex issues, go to Help & Support → Contact Us, or email support@outboundimpact.org directly. The AI can also escalate to a human agent for billing issues, technical bugs, or urgent matters.' },
    { id: 45, category: 'sharing', question: 'What happens to my QR codes if I cancel?', answer: 'After cancellation, your QR codes stop working at the end of your billing period (monthly plans) or at your expiry date (annual plans). If you reactivate your subscription, all QR codes work again immediately.' },

    // ── MESSAGES & INBOX ──
    { id: 46, category: 'enterprise', question: 'How does the Messages/Inbox feature work?', answer: 'Messages (available on Growth, Pro, Enterprise) lets you send messages to team members or audience members directly within the platform. Compose a message with a subject and body, choose recipients, and send. Recipients get an email notification and can view messages in their Inbox. Read/unread status is tracked.' },

    // ── AI CHAT & LIVE CHAT ──
    { id: 47, category: 'getting-started', question: 'What is the AI Chat widget?', answer: 'The AI Chat widget is the purple chat bubble in the bottom-right corner of every page. Click it to get instant 24/7 help from our AI assistant. It knows everything about the platform — plans, features, billing, uploads, analytics, and more. Your conversation history is preserved. For complex issues, the AI automatically escalates to a human support agent.' },
    { id: 48, category: 'getting-started', question: 'How does Live Chat with support work?', answer: 'Go to Settings → Live Chat to start a real-time conversation with our support team. Messages are delivered within seconds (polling every 3 seconds). You can attach files. Chats auto-close after 15 minutes of inactivity. After closing, you can rate the experience (1–5 stars). Start a new chat anytime with the "New Chat" button.' },

    // ── PROFILE & ACCOUNT ──
    { id: 49, category: 'billing', question: 'How do I update my profile?', answer: 'Go to Settings to update your name. Click "Change Photo" to upload or change your profile picture. Your email address cannot be changed after signup. Team members can also update their own profile.' },
    { id: 50, category: 'billing', question: 'How do I change my password?', answer: 'Go to your Profile page and use the password change section. Enter your current password and your new password. If you forgot your password, click "Forgot Password" on the Sign In page — you\'ll receive a reset link via email.' },
    { id: 51, category: 'billing', question: 'How do I delete my account?', answer: 'Go to your Profile page and click "Delete Account." WARNING: This permanently deletes ALL your data — uploads, QR codes, campaigns, analytics, everything. This CANNOT be undone. If you want a refund, cancel your subscription FIRST via Billing & Account. Deleting your account forfeits any refund eligibility.' },

    // ── STORAGE ──
    { id: 52, category: 'content', question: 'What are storage alerts?', answer: 'When your storage usage reaches 80%, a warning banner appears on your dashboard. At 90%, the warning escalates. At 95%, you get a critical alert recommending cleanup or a storage upgrade. You can purchase add-on packs (50 GB/$4.99, 100 GB/$8.99, 200 GB/$14.99) directly from the alert banner.' },
    { id: 53, category: 'content', question: 'Where can I see my storage usage?', answer: 'Your storage usage bar appears in Settings → Billing & Account, showing exactly how much you\'ve used out of your total limit (e.g., "2.3 GB of 25 GB used"). The dashboard also shows a storage summary. Delete unused items from My Items page to free up space.' },

    // ── SUSPENSION & REACTIVATION ──
    { id: 54, category: 'billing', question: 'What happens if my account gets suspended?', answer: 'Accounts are suspended if an annual plan (Personal Single Use or Org Events) is not renewed within 7 days after expiry. When suspended, you\'ll see a suspension notice when trying to sign in. Your data is preserved — reactivate by paying the renewal fee. Contact support@outboundimpact.org if you need help.' },
    { id: 55, category: 'billing', question: 'How do I reactivate a canceled subscription?', answer: 'Go to Settings → Billing & Account and click "Reactivate." This creates a new Stripe subscription with the same plan and pricing. Your access is restored immediately and all your content and QR codes start working again.' },

    // ── PUBLIC VIEWER ──
    { id: 56, category: 'sharing', question: 'What do people see when they scan my QR code?', answer: 'Scanners see a clean, branded viewer page with your content — no app download, no signup required. For individual items, they see the media (image, video, audio) with title and description. For Streams/Campaigns, they see a scrollable collection of all items in that group, with the campaign name and logo. If password-protected, they see a password entry screen first.' },

    // ── NOTIFICATIONS ──
    { id: 57, category: 'getting-started', question: 'How do notifications work?', answer: 'The bell icon in the top navigation shows your in-app notifications. You receive notifications for: team invitations, new team member activity, subscription events, storage warnings, and push subscription updates. Email notifications are sent for: team invitations, messages received, subscription renewals/cancellations, and storage alerts.' },

    // ── CURRENCY ──
    { id: 58, category: 'billing', question: 'Can I see prices in my local currency?', answer: 'Yes! Prices are automatically displayed in your local currency using live exchange rates (updated hourly). The base currency is USD. At checkout, Stripe handles the actual currency conversion for your payment method.' },

    // ── SHARE/RECEIVE (PWA) ──
    { id: 59, category: 'sharing', question: 'Can I share content TO Outbound Impact from my phone?', answer: 'Yes! OI works as a Progressive Web App (PWA). When you share a photo, video, or link from any other app on your phone, Outbound Impact appears as a share target. Select it, review the title/caption, and post directly to OI. You can then use Amplify to share it further to social platforms.' },

    // ── ENTERPRISE FEATURES DETAIL ──
    { id: 60, category: 'enterprise', question: 'What is the Organizations feature?', answer: 'Organizations (Growth, Pro, Enterprise) allows multi-organization management. Create separate organizations with their own content libraries, team members, and analytics. Perfect for agencies, franchises, or companies managing multiple brands.' },
    { id: 61, category: 'enterprise', question: 'What is the Compliance feature?', answer: 'Compliance (Enterprise only) provides compliance reporting and monitoring tools, data governance features, and regulatory requirement tracking. Essential for organizations that need to meet industry or government regulations.' },
    { id: 62, category: 'enterprise', question: 'What is the Security/2FA feature?', answer: 'Security (Enterprise only) includes advanced security settings and two-factor authentication (2FA) via email verification. Enhanced access controls for sensitive content and accounts.' },
    { id: 63, category: 'enterprise', question: 'What is White Label?', answer: 'White Label (Enterprise only) lets you customize the platform\'s appearance with your own branding — custom colors, logos, and styling. Remove OI branding so it looks like your own platform to your audience.' },

    // ── CONTENT MANAGEMENT DETAILS ──
    { id: 64, category: 'content', question: 'Can I reorder content within a Stream/Campaign?', answer: 'Yes! When viewing a Stream/Campaign, you can drag and drop items to reorder them. The order you set is the order viewers see when they scan the QR code. Only account owners and Editors can reorder — Viewers see read-only mode.' },
    { id: 65, category: 'content', question: 'Can I add a logo to my Campaign?', answer: 'Yes! When creating or editing a Campaign, you can upload a custom logo. This logo appears at the top of the public campaign viewer when someone scans your QR code, giving your campaign a professional branded look.' },
    { id: 66, category: 'sharing', question: 'How do I download a QR code?', answer: 'Go to your Stream/Campaign, click the download icon next to the QR code. It downloads as a high-resolution PNG image ready for printing. You can place it on posters, business cards, product packaging, signage, or any physical material.' },

    // ── SIGNUP & ONBOARDING ──
    { id: 67, category: 'getting-started', question: 'How does the signup process work?', answer: 'The flow is: 1) Visit /plans and choose your plan. 2) Click "Get Started" — you\'re taken to the signup page. 3) Enter your name, email, and password. 4) Complete payment via Stripe checkout. 5) Redirected to your Dashboard — you\'re in! If you already have an account, click "Sign In" instead.' },
    { id: 68, category: 'getting-started', question: 'I forgot my password. How do I reset it?', answer: 'Click "Forgot Password" on the Sign In page. Enter your email address. You\'ll receive a password reset link via email. Click the link, enter your new password, and you\'re back in. The link expires after a short time for security.' },

    // ── TEAM INVITATION FLOW ──
    { id: 69, category: 'teams', question: 'How do I accept a team invitation?', answer: 'When invited, you receive an email with a "Join Team" link. Click it, create your account (name, email, password), and you\'re automatically added to the organization with the role your admin assigned. You\'ll see the organization\'s dashboard and shared content.' },

    // ── PUBLIC LINKS & SLUGS ──
    { id: 70, category: 'sharing', question: 'What is a public link/slug?', answer: 'Every item and Campaign gets a unique "slug" — a short URL like outboundimpact.net/v/my-content or outboundimpact.net/c/my-campaign. This is the link that QR codes point to. Viewers access your content through this link. You can share it directly via text, email, or social media without needing the QR code.' },

    // ── FEEDBACK ──
    { id: 71, category: 'getting-started', question: 'How do I give feedback about the platform?', answer: 'Go to Help & Support → Contact Us and fill out the form. Choose a category (General, Technical, Billing, Feature Request, Bug Report, Enterprise). Your feedback goes directly to the support team. You can also use the AI chat widget or email support@outboundimpact.org directly.' },

    // ── UPGRADE ──
    { id: 72, category: 'plans', question: 'How do I upgrade my plan?', answer: 'Go to Settings → Billing & Account and click "Upgrade." You\'ll see all available plans with their features and pricing. Select a higher plan and complete payment. Your upgrade takes effect immediately — all new features, storage, and limits are available right away. Your existing content is preserved.' },

    // ── PER-PLAN DASHBOARD FEATURES ──
    { id: 73, category: 'plans', question: 'What features does the Personal Single Use plan dashboard include?', answer: 'Dashboard: Welcome banner, stats, storage usage, quick actions, recent items. Sidebar: Upload, My Items, Streams (1 stream), Basic Analytics (views, devices, sources), Contributors (up to 2 people), Settings (profile, billing & account, auto-renewal, cancel, refund policy). You also get 1 QR/NFC code, 25 GB storage, password protection, social sharing, custom thumbnails, media editor, and AI chat support. This plan does NOT include: Activity Feed, Messages, Advanced Analytics, Cohorts, Workflows, Organizations, Audit Log, or push notifications.' },
    { id: 74, category: 'plans', question: 'What features does the Personal Life Events plan dashboard include?', answer: 'Dashboard: Welcome banner, stats, storage usage, quick actions, recent items. Sidebar: Upload, My Items, Streams (up to 10), Full Analytics (views, devices, sources, browsers), Settings (profile, billing & account, auto-renewal, cancel, refund policy). You get 10 QR/NFC codes, 100 GB storage, push notifications, and all upload/sharing features. NOTE: Life Events does NOT have Contributors — it\'s a solo personal plan. This plan does NOT include: Activity Feed, Messages, Advanced Analytics, Cohorts, Workflows, Organizations, or Audit Log.' },
    { id: 75, category: 'plans', question: 'What features does the Org Events plan dashboard include?', answer: 'Dashboard: Org stats, campaign performance, team activity, quick actions. Sidebar: Upload, My Items, Campaigns (up to 80), Cohorts (audience segmentation), All Activity (real-time scan feed), Messages. Settings: Contributors (up to 5 team members), Billing & Account, Profile. Plus Help & Support. You get 80 QR/NFC codes, 250 GB storage, push notifications. IMPORTANT: Org Events has Cohorts and Activity Feed but does NOT have Advanced Analytics — it uses the Activity Feed instead. Does NOT include: Workflows, Organizations, Audit Log, Compliance, or Security.' },
    { id: 76, category: 'plans', question: 'What features does the Starter plan dashboard include?', answer: 'Dashboard: Org stats, campaign performance, quick actions. Sidebar: Upload, My Items, Campaigns (up to 20), All Activity (real-time feed), Messages. Settings: Contributors (up to 3 team members), Billing & Account, Profile. Plus Help & Support. You get 20 QR/NFC codes, 100 GB storage, push notifications, CSV exports. IMPORTANT: Starter has NO Analytics page at all (neither Basic nor Advanced) — it uses the All Activity feed only. Does NOT include: Analytics, Cohorts, Segmentation, Workflows, Organizations, Audit Log, Compliance, or Security.' },
    { id: 77, category: 'plans', question: 'What features does the Growth plan dashboard include?', answer: 'Dashboard: Org stats, advanced metrics, quick actions. Sidebar: Upload, My Items, Campaigns (up to 30), Advanced Analytics (geographic data, time patterns, trends, CSV/PDF export), All Activity, Messages/Inbox. Growth Features section: Cohorts (audience segmentation) and Organizations (multi-org management). Settings: Contributors (unlimited team members), Billing & Account, Profile. Plus Help & Support. You get 30 QR/NFC codes, 250 GB storage, segmentation, push notifications. Does NOT include: Workflows, Audit Log, Compliance, or Security.' },
    { id: 78, category: 'plans', question: 'What features does the Pro plan dashboard include?', answer: 'Dashboard: Org stats, advanced metrics, quick actions. Sidebar: Upload, My Items, Campaigns (up to 50), Advanced Analytics, All Activity, Messages/Inbox. Pro Features section: Organizations and Workflows (automated task sequences). Settings: Contributors (unlimited), Billing & Account, Profile. Plus Help & Support. You get 50 QR/NFC codes, 500 GB storage, Audit Log, all export formats, priority support. Does NOT include: Compliance or Security (Enterprise only).' },
    { id: 79, category: 'plans', question: 'What features does the Enterprise plan dashboard include?', answer: 'EVERYTHING on the platform. Dashboard: Enterprise metrics and quick actions. Sidebar: Upload, My Items, Campaigns (unlimited), Advanced Analytics, All Activity, Messages/Inbox. Enterprise section: Cohorts, Workflows, Organizations, Audit Log, Compliance. Settings: Contributors (unlimited), Security (2FA, advanced access controls), Billing & Account, Profile. Plus Help & Support. Unlimited QR/NFC codes, 1.5 TB+ storage, SLA guarantees, dedicated support, white-label options. To get Enterprise, click "Contact Us" on the Plans page.' },
  ];

  // Filter FAQs
  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle contact form submit
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.subject.trim() || !contactForm.message.trim()) return;

    setSending(true);
    try {
      await api.post('/user/feedback', {
        type: 'support',
        subject: contactForm.subject,
        message: contactForm.message,
        category: contactForm.category,
        contactEmail: contactForm.email,
        contactName: contactForm.name,
      });
      setSent(true);
      setContactForm(prev => ({ ...prev, subject: '', message: '', category: 'general' }));
      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error('Failed to send:', error);
      // Fallback: open mailto
      const mailtoLink = `mailto:support@outboundimpact.org?subject=${encodeURIComponent(contactForm.subject)}&body=${encodeURIComponent(`Name: ${contactForm.name}\nEmail: ${contactForm.email}\nCategory: ${contactForm.category}\n\n${contactForm.message}`)}`;
      window.open(mailtoLink, '_blank');
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600">Get help with using Outbound Impact</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-lg">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'guide'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={16} />
            User Guide
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'data'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield size={16} />
            Data & Privacy
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'contact'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} />
            Contact Us
          </button>
        </div>

        {/* ═══════════════════════════════════
            USER GUIDE TAB
           ═══════════════════════════════════ */}
        {activeTab === 'guide' && (
          <div>
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-gray-600 mb-4">Learn how to use all features of Outbound Impact</p>
                <button
                  onClick={() => setActiveCategory('all')}
                  className="text-primary hover:text-secondary font-medium text-sm"
                >
                  Browse FAQ below →
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Mail size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Support</h3>
                <p className="text-gray-600 mb-4">Get help directly from our team</p>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="text-primary hover:text-secondary font-medium text-sm"
                >
                  Contact Us →
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-purple-100 text-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
                <p className="text-sm text-gray-500 mt-1">{filteredFaqs.length} topics found</p>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredFaqs.map((faq) => (
                  <div key={faq.id}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                          expandedFaq === faq.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-l-4 border-primary ml-5 pl-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No topics match your search. Try different keywords or <button onClick={() => setActiveTab('contact')} className="text-primary font-medium">contact us</button>.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            DATA & PRIVACY TAB — from Pablo's DataCollectionPage
           ═══════════════════════════════════ */}
        {activeTab === 'data' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Collection & Privacy</h2>
              <p className="text-gray-600">What we collect, how it's stored, and how it flows through our system.</p>
            </div>

            {/* ── WHAT WE COLLECT ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><FileText size={20} className="text-primary" /> What We Collect</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Information */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3"><Users size={18} className="text-blue-600" /><h4 className="font-bold text-gray-900">User Information</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span> Name (entered during sign-up)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span> Email address</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span> Profile photo (optional)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span> Password (hashed with bcrypt — never stored in plain text)</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-3 font-medium">Stored: Encrypted in users table</p>
                </div>
                {/* Organization Details */}
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3"><Settings size={18} className="text-purple-600" /><h4 className="font-bold text-gray-900">Organization Details</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></span> Company/organization name</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></span> Industry and team size</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></span> Website URL</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></span> Team member roles and permissions</li>
                  </ul>
                  <p className="text-xs text-purple-600 mt-3 font-medium">Stored: Organizations table linked to owner</p>
                </div>
                {/* QR Code Data */}
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-3"><QrCode size={18} className="text-green-600" /><h4 className="font-bold text-gray-900">QR Code & Content Data</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span> QR code name and destination URL</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span> Created date (auto-generated)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span> QR code image (auto-generated PNG)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span> Uploaded media files (stored on CDN)</li>
                  </ul>
                  <p className="text-xs text-green-600 mt-3 font-medium">Stored: Items table + Bunny.net CDN</p>
                </div>
                {/* Scan Analytics */}
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <div className="flex items-center gap-2 mb-3"><BarChart size={18} className="text-orange-600" /><h4 className="font-bold text-gray-900">Scan Analytics</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span> Scan timestamp (UTC)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span> Location (city/country from IP)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span> Device type (auto-detected)</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span> Browser and operating system</li>
                  </ul>
                  <p className="text-xs text-orange-600 mt-3 font-medium">Collected: Automatically on every scan (no setup needed)</p>
                </div>
                {/* Billing */}
                <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                  <div className="flex items-center gap-2 mb-3"><Settings size={18} className="text-yellow-600" /><h4 className="font-bold text-gray-900">Billing & Subscriptions</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span> Plan type and billing cycle</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span> Last 4 digits of payment card</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span> Subscription status and dates</li>
                  </ul>
                  <p className="text-xs text-yellow-600 mt-3 font-medium">Stored: Payment tokens in Stripe only — never on our servers</p>
                </div>
                {/* Messages */}
                <div className="bg-pink-50 rounded-xl p-5 border border-pink-100">
                  <div className="flex items-center gap-2 mb-3"><MessageSquare size={18} className="text-pink-600" /><h4 className="font-bold text-gray-900">Messages & Communications</h4></div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-pink-400 rounded-full flex-shrink-0"></span> Message text and subject</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-pink-400 rounded-full flex-shrink-0"></span> Sender and recipient</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-pink-400 rounded-full flex-shrink-0"></span> Sent date and read status</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-pink-400 rounded-full flex-shrink-0"></span> Chat and feedback conversations</li>
                  </ul>
                  <p className="text-xs text-pink-600 mt-3 font-medium">Stored: Messages table with sender/recipient IDs</p>
                </div>
              </div>
            </div>

            {/* ── HOW DATA FLOWS ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Zap size={20} className="text-primary" /> How Data Flows Through the System</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'User Input', desc: 'You enter data via forms, dashboard, or file upload.', color: 'bg-blue-600' },
                  { step: 2, title: 'Client Validation', desc: 'JavaScript validates format, required fields, and character length in your browser.', color: 'bg-purple-600' },
                  { step: 3, title: 'Server Validation', desc: 'Backend double-checks all validations for security — protects against tampering.', color: 'bg-orange-500' },
                  { step: 4, title: 'Data Processing', desc: 'Data is sanitized (HTML/scripts removed), formatted, and prepared for storage.', color: 'bg-green-600' },
                  { step: 5, title: 'Secure Storage', desc: 'Clean data stored in PostgreSQL database. Media files stored on Bunny.net CDN.', color: 'bg-primary' },
                  { step: 6, title: 'Confirmation', desc: 'Success confirmation returned to you. Data is now securely stored and accessible.', color: 'bg-green-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>{s.step}</div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h4 className="font-bold text-gray-900 text-sm">{s.title}</h4>
                      <p className="text-gray-600 text-sm mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECURITY PRACTICES ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Shield size={20} className="text-primary" /> Security & Privacy Practices</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Encrypted connections', desc: 'All data transmitted via HTTPS/TLS encryption' },
                  { label: 'Password hashing', desc: 'bcrypt algorithm — passwords never stored in plain text' },
                  { label: 'PCI-compliant payments', desc: 'Stripe handles all card data — Level 1 PCI certified' },
                  { label: 'Secure data centers', desc: 'Database hosted in professionally managed infrastructure' },
                  { label: 'GDPR compliant', desc: 'Data handling follows European privacy regulations' },
                  { label: 'Input sanitization', desc: 'All user input sanitized to prevent XSS and injection attacks' },
                  { label: 'Enterprise 2FA', desc: 'Two-factor authentication available for Enterprise accounts' },
                  { label: 'Audit logging', desc: 'Complete action trail for Pro and Enterprise plans' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── QUESTIONS? ── */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-center text-white">
              <Shield size={32} className="mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold mb-2">Your data is safe with us</h3>
              <p className="text-white/80 text-sm max-w-md mx-auto mb-4">Multiple validation layers ensure only clean, properly formatted data reaches our database. Payment details never touch our servers.</p>
              <button onClick={() => setActiveTab('contact')} className="px-6 py-2.5 bg-white text-primary rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors">Have a question? Contact us</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            CONTACT US TAB - Direct Email Form
           ═══════════════════════════════════ */}
        {activeTab === 'contact' && (
          <div>
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mail size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <p className="text-xs text-gray-500 mt-1">support@outboundimpact.org</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Response Time</p>
                <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Globe size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Hours</p>
                <p className="text-xs text-gray-500 mt-1">Mon–Fri, 9am–6pm EST</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Send us a message</h3>
              <p className="text-gray-600 text-sm mb-6">We'll get back to you as soon as possible.</p>

              {sent && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Message sent successfully!</p>
                    <p className="text-sm text-green-600">We'll get back to you within 24 hours.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm bg-white"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Account</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="enterprise">Enterprise Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="How can we help?"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm resize-none"
                    placeholder="Describe your issue or question in detail..."
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-400">
                    Your message will be sent to our support team
                  </p>
                  <button
                    type="submit"
                    disabled={sending || !contactForm.subject.trim() || !contactForm.message.trim()}
                    className="gradient-btn text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupportPage;