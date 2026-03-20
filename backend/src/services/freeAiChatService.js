const Groq = require('groq-sdk');

// Initialize Groq AI (100% FREE!)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // FREE API key - no credit card needed!
});

// ═══════════════════════════════════════════════════════════
// OUTBOUND IMPACT PLATFORM KNOWLEDGE - COMPREHENSIVE A-Z
// Updated: March 2026
// ═══════════════════════════════════════════════════════════

const OI_PLATFORM_KNOWLEDGE = `
# OUTBOUND IMPACT (OI) — COMPLETE PLATFORM KNOWLEDGE BASE

## 1. WHAT IS OUTBOUND IMPACT?
Outbound Impact (OI) is a SaaS media sharing platform that bridges physical and digital worlds. Users upload content (images, videos, audio, documents, text, embedded links), generate QR codes and NFC tags, and track real-time analytics on who scans, when, where, and on which device. No app required for viewers — they just scan and see.

Website: outboundimpact.org
App: outboundimpact.net
Support email: support@outboundimpact.org

## 2. SUBSCRIPTION PLANS — COMPLETE PER-PLAN FEATURES & DASHBOARD

IMPORTANT FOR AI: When a user asks about features, respond based on their specific plan. If a user asks about a feature not included in their plan, explain that it's available on a higher plan and suggest upgrading.

### ═══════════════════════════════════════════
### PLAN 1: PERSONAL SINGLE USE ($69 first year)
### ═══════════════════════════════════════════

**Price:** $69 first year, then $10/year renewal for continued viewing
**Storage:** 25 GB (unlimited uploads)
**Streams:** 1 stream allowed
**QR/NFC codes:** 1
**Contributors:** Up to 2 people
**Dashboard type:** Individual Dashboard
**Best for:** Single events, memorials, one-off personal projects

**DASHBOARD SIDEBAR MENU:**
- Dashboard (welcome banner, stats, storage, quick actions, recent items)
- Content section:
  - Upload (drag & drop files, text with CTA buttons, embed links)
  - My Items (view all uploaded content with QR codes)
  - Streams (1 stream — group items into a collection)
- Analytics (Basic — total views, views by source, device types, browsers)
- Contributors (invite up to 2 people to view/contribute)
- Settings (profile, current plan, billing & account, auto-renewal, cancel, refund policy)

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- Analytics
- Streams

**WHAT THIS PLAN INCLUDES:**
- Upload images, videos, audio, documents, text with CTA buttons, embed links
- 1 QR code auto-generated
- 1 NFC tag URL
- Basic analytics (views, devices, sources)
- Password protection for streams
- Social sharing (Facebook, X, LinkedIn, WhatsApp, Email)
- Custom thumbnails
- Media editor (crop, rotate, trim)
- AI chat support
- 7-day refund policy
- Storage alerts at 80%/90%/95%
- Storage add-on packs available ($4.99/50GB, $8.99/100GB, $14.99/200GB)

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Advanced Analytics, Activity Feed, Messages/Inbox, Segmentation
- Cohorts, Workflows, Organizations, Audit Log, Compliance, Security
- Amplify (multi-platform share)
- Push notifications
- Team management (beyond 2 contributors)

**RENEWAL SYSTEM:**
- Year 1: Full access to upload and share
- Day 335: 30-day email reminder with $10 renewal payment link
- Day 358: 7-day urgent reminder
- Day 365: Expiry notice
- Day 372: Account suspended if unpaid (data preserved, reactivate by paying)
- $10 renewal ONLY extends viewing access — no additional storage or features

### ═══════════════════════════════════════════
### PLAN 2: PERSONAL LIFE EVENTS ($15/month)
### ═══════════════════════════════════════════

**Price:** $15 per month (recurring)
**Storage:** 100 GB (unlimited uploads)
**Streams:** Up to 10 streams
**QR/NFC codes:** Up to 10
**Contributors:** None (personal use only)
**Dashboard type:** Individual Dashboard
**Best for:** Ongoing personal use — memorials, portfolios, family milestones, life events

**DASHBOARD SIDEBAR MENU:**
- Dashboard (welcome banner, stats, storage, quick actions, recent items)
- Content section:
  - Upload
  - My Items
  - Streams (up to 10)
- Analytics (Full — total views, views by source, device types, browsers)
- Settings (profile, current plan, billing & account, auto-renewal, cancel, refund policy)

**NOTE:** Personal Life Events does NOT have Contributors (unlike Single Use which has 2). This is a solo personal plan.

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- Analytics
- Streams

**WHAT THIS PLAN INCLUDES:**
Everything in Personal Single Use PLUS:
- 10 streams instead of 1
- 10 QR/NFC codes
- 100 GB storage
- Full analytics
- Push notifications
- Monthly billing with auto-renewal

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Contributors/team members
- Advanced Analytics, Activity Feed
- Messages/Inbox, Segmentation
- Cohorts, Workflows, Organizations, Audit Log, Compliance, Security
- Amplify (multi-platform share)

### ═══════════════════════════════════════════
### PLAN 3: ORG EVENTS ($199 first year)
### ═══════════════════════════════════════════

**Price:** $199 first year, then $65/year renewal
**Storage:** 250 GB (unlimited uploads)
**Campaigns:** 80 campaigns
**QR/NFC codes:** 80
**Contributors:** Up to 5 team members
**Dashboard type:** Organization Dashboard
**Best for:** One-off events, conferences, exhibitions, sports tournaments, fundraisers

**DASHBOARD SIDEBAR MENU:**
- Dashboard (org stats, campaign performance, team activity, quick actions)
- Content section:
  - Upload
  - My Items
  - Campaigns (up to 80)
- Cohorts (create audience segments, assign campaigns)
- All Activity (real-time feed of all scans and views)
- Messages (send messages to team members)
- Settings section:
  - Contributors (invite up to 5 team members: Admin, Editor, Viewer)
  - Billing & Account (plan details, auto-renewal, cancel, refund)
  - Profile
- Help & Support

**NOTE:** Org Events has Cohorts and Activity Feed but does NOT have Advanced Analytics. It has All Activity instead.

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- All Activity
- Campaigns

**WHAT THIS PLAN INCLUDES:**
- 80 campaigns with QR/NFC codes each
- 250 GB storage
- Cohorts (audience segmentation)
- All Activity feed (real-time scan tracking)
- Messages/Inbox
- Team collaboration (5 members with roles: Admin, Editor, Viewer)
- Password-protected campaigns
- Push notifications
- Social sharing + all org features

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Advanced Analytics (uses Activity Feed instead)
- Workflows, Organizations management, Audit Log, Compliance, Security
- Amplify

**RENEWAL SYSTEM:**
Same as Personal Single Use but at $65/year renewal. Email reminders at 30 and 7 days. Suspension 7 days after expiry. Renewal only extends access.

### ═══════════════════════════════════════════
### PLAN 4: STARTER ($49/month)
### ═══════════════════════════════════════════

**Price:** $49 per month (recurring)
**Storage:** 100 GB (unlimited uploads)
**Campaigns:** 20 campaigns
**QR/NFC codes:** 20
**Contributors:** Up to 3 team members (up to 1,000 audience members)
**Dashboard type:** Organization Dashboard
**Best for:** Growing communities, small clubs, customer groups, small businesses

**DASHBOARD SIDEBAR MENU:**
- Dashboard (org stats, campaign performance, quick actions)
- Content section:
  - Upload
  - My Items
  - Campaigns (up to 20)
- All Activity (real-time scan/view feed)
- Messages
- Settings section:
  - Contributors (up to 3 team members)
  - Billing & Account
  - Profile
- Help & Support

**IMPORTANT:** Starter does NOT have Analytics at all. It uses the All Activity feed instead. No Advanced Analytics, no basic analytics page.

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- All Activity (NOT Analytics)
- Campaigns

**WHAT THIS PLAN INCLUDES:**
- 20 campaigns with QR/NFC codes
- 100 GB storage
- All Activity feed
- Messages/Inbox
- Team collaboration (3 members)
- Push notifications
- CSV exports
- Password-protected campaigns

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Analytics (Basic or Advanced) — uses Activity Feed only
- Cohorts, Segmentation
- Workflows, Organizations, Audit Log, Compliance, Security

### ═══════════════════════════════════════════
### PLAN 5: GROWTH ($69/month)
### ═══════════════════════════════════════════

**Price:** $69 per month (recurring)
**Storage:** 250 GB (unlimited uploads)
**Campaigns:** 30 campaigns
**QR/NFC codes:** 30
**Contributors:** Unlimited team members (up to 2,500 audience members)
**Dashboard type:** Organization Dashboard
**Best for:** Mid-size organizations, sports clubs, car clubs, faith organizations

**DASHBOARD SIDEBAR MENU:**
- Dashboard (org stats, advanced metrics, quick actions)
- Content section:
  - Upload
  - My Items
  - Campaigns (up to 30)
- Advanced Analytics (geographic data, time patterns, trends, exports)
- All Activity (real-time feed)
- Messages/Inbox
- Growth Features section:
  - Cohorts (audience segmentation)
  - Organizations (multi-org management)
- Settings section:
  - Contributors (unlimited team members)
  - Billing & Account
  - Profile
- Help & Support

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- Advanced Analytics
- Campaigns

**WHAT THIS PLAN INCLUDES:**
Everything in Starter PLUS:
- Advanced Analytics (geographic data, time patterns, campaign comparisons, CSV/PDF export)
- Cohorts (audience groups, import members, assign campaigns)
- Organizations management
- Segmentation & groups
- Unlimited team members
- 250 GB storage, 30 campaigns

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Workflows, Audit Log, Compliance, Security

### ═══════════════════════════════════════════
### PLAN 6: PRO ($99/month)
### ═══════════════════════════════════════════

**Price:** $99 per month (recurring)
**Storage:** 500 GB (unlimited uploads)
**Campaigns:** 50 campaigns
**QR/NFC codes:** 50
**Contributors:** Unlimited team members (up to 5,000 audience members)
**Dashboard type:** Organization Dashboard
**Best for:** Large organizations with growing member, customer, and supporter bases

**DASHBOARD SIDEBAR MENU:**
- Dashboard (org stats, advanced metrics, quick actions)
- Content section:
  - Upload
  - My Items
  - Campaigns (up to 50)
- Advanced Analytics
- All Activity
- Messages/Inbox
- Pro Features section:
  - Organizations (multi-org management)
  - Workflows (automated task sequences)
- Settings section:
  - Contributors (unlimited)
  - Billing & Account
  - Profile
- Help & Support

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- Advanced Analytics
- Campaigns

**WHAT THIS PLAN INCLUDES:**
Everything in Growth PLUS:
- Workflows (automated task sequences: Draft, Active, Paused, Completed)
- Audit Log (complete action trail — who did what, when)
- 500 GB storage, 50 campaigns
- All export formats
- Priority support

**WHAT THIS PLAN DOES NOT INCLUDE:**
- Compliance, Security (Enterprise only)

### ═══════════════════════════════════════════
### PLAN 7: ENTERPRISE (Custom pricing)
### ═══════════════════════════════════════════

**Price:** Custom pricing starting at $99+/month (contact sales)
**Storage:** 1.5 TB+ (scalable)
**Campaigns:** Unlimited
**QR/NFC codes:** Unlimited
**Contributors:** Unlimited (5,000+ audience members)
**Dashboard type:** Organization Dashboard
**Best for:** Large enterprises, multi-brand management, global organizations

**DASHBOARD SIDEBAR MENU:**
- Dashboard (org stats, enterprise metrics, quick actions)
- Content section:
  - Upload
  - My Items
  - Campaigns (unlimited)
- Advanced Analytics
- All Activity
- Messages/Inbox
- Enterprise section:
  - Cohorts
  - Workflows
  - Organizations
  - Audit Log (complete action trail)
  - Compliance (regulatory reporting)
- Settings section:
  - Contributors (unlimited)
  - Security (2FA, advanced access controls)
  - Billing & Account
  - Profile
- Help & Support

**DASHBOARD QUICK ACTIONS:**
- Upload content
- My Items
- Advanced Analytics
- Campaigns

**WHAT THIS PLAN INCLUDES:**
EVERYTHING — all features on the platform:
- Unlimited campaigns, QR/NFC codes, team members
- 1.5 TB+ storage (scalable)
- Advanced Analytics with full exports
- Cohorts, Organizations, Workflows
- Audit Log, Compliance reporting
- Security (2FA, advanced access controls)
- Messages/Inbox, Segmentation
- All Activity feed
- Push notifications
- SLA guarantees
- Dedicated support
- White-label options (custom branding)

**How to get Enterprise:** Click "Contact Us" on the Plans page — a lead form captures your details and the OI team contacts you.

### ═══════════════════════════════════════════
### PLAN COMPARISON QUICK REFERENCE
### ═══════════════════════════════════════════

| Feature | Single Use | Life Events | Org Events | Starter | Growth | Pro | Enterprise |
|---------|-----------|-------------|------------|---------|--------|-----|------------|
| Price | $69/yr | $15/mo | $199/yr | $49/mo | $69/mo | $99/mo | Custom |
| Renewal | $10/yr | Monthly | $65/yr | Monthly | Monthly | Monthly | Monthly |
| Uploads | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| Streams/Campaigns | 1 | 10 | 80 | 20 | 30 | 50 | Unlimited |
| QR/NFC | 1 | 10 | 80 | 20 | 30 | 50 | Unlimited |
| Storage | 25GB | 100GB | 250GB | 100GB | 250GB | 500GB | 1.5TB+ |
| Contributors | 2 | 0 | 5 | 3 | Unlimited | Unlimited | Unlimited |
| Basic Analytics | Yes | Yes | No | No | No | No | No |
| Advanced Analytics | No | No | No | No | Yes | Yes | Yes |
| Activity Feed | No | No | Yes | Yes | Yes | Yes | Yes |
| Messages/Inbox | No | No | Yes | Yes | Yes | Yes | Yes |
| Cohorts | No | No | Yes | No | Yes | Yes | Yes |
| Organizations | No | No | No | No | Yes | Yes | Yes |
| Workflows | No | No | No | No | No | Yes | Yes |
| Audit Log | No | No | No | No | No | Yes | Yes |
| Compliance | No | No | No | No | No | No | Yes |
| Security/2FA | No | No | No | No | No | No | Yes |
| Push Notifications | No | Yes | Yes | Yes | Yes | Yes | Yes |

### TEAM MEMBER ROLES (Organization plans)
- **ADMIN** — Full access to everything including billing, team, all features
- **EDITOR** — Can upload, edit, manage campaigns. Cannot manage billing or team.
- **VIEWER** — View-only access to content and analytics. Cannot upload, edit, or delete.
- VIEWERs can request role upgrades from their dashboard.
- Feature access per team member is controlled during invitation (for VIEWER/EDITOR).

NOTE: All plans have UNLIMITED uploads — storage is the only constraint. Every plan includes QR code generation, NFC support, and no app required for viewers.

## 3. CONTENT UPLOAD & MANAGEMENT

### Supported File Types
- Images: PNG, JPG, JPEG, GIF, WebP
- Videos: MP4, MOV, AVI, WebM
- Audio: MP3, WAV, OGG, M4A
- Documents: PDF, DOC, DOCX, TXT
- Thumbnails: PNG, JPG, GIF, WebP (max 5MB)

### Upload Methods
1. **Direct File Upload** — Drag and drop or browse from device (desktop or mobile)
2. **Text Content with CTA Buttons** — Create text posts with actionable buttons (Visit Website, Learn More, Contact Us, Buy Now, etc.)
3. **Embed Links** — Paste a URL and it auto-converts:
   - YouTube (regular videos, Shorts, and playlists)
   - Vimeo
   - SoundCloud
   - Spotify
   - Google Drive, Docs, Sheets, Slides

### Media Editor (edit before uploading)
- **Photos:** Crop, rotate, brightness/contrast adjustments
- **Videos:** Trim start/end with preview
- **Audio:** Trim with waveform visualization

### Item Management
- Add custom thumbnails
- Edit titles and descriptions
- Add items to multiple Streams/Campaigns
- Share individually or in collections
- Download original files
- Delete items
- View analytics per item

### Storage
- All uploads stored on Bunny.net CDN for worldwide fast access
- Storage usage shown in Settings → Billing & Account
- Storage alerts at 80%, 90%, and 95% usage
- Purchase additional storage packs: 50GB ($4.99), 100GB ($8.99), 200GB ($14.99)

## 4. STREAMS & CAMPAIGNS

**Terminology:**
- Personal plans call them "Streams"
- Organization plans call them "Campaigns"
- They work identically — just different labels

### Features
- Create multiple Streams/Campaigns (limit depends on plan)
- Add multiple content items to each
- Reorder items within a campaign
- Each gets a unique QR code and shareable link
- Custom display name and logo
- Password protection (QR stays public, content requires password)
- Social sharing (Facebook, Twitter/X, LinkedIn, WhatsApp, Instagram, Email)
- Download QR code as PNG image
- Campaign-level analytics

### Password Protection
- Enable per-Stream/Campaign
- QR code can be placed publicly — anyone can scan
- Viewer must enter password before accessing content
- Perfect for: exclusive content, members-only materials, internal documents, client presentations

## 5. QR CODES & NFC TAGS

### QR Codes
- Automatically generated for every item and every Stream/Campaign
- High-resolution PNG download
- Print-ready quality
- Free to generate and download
- Tracked: every scan records device, location, time, browser

### NFC Tags
- Write content URL to NFC tags directly from the app
- Tap-to-view experience — no app needed
- Compatible with all NFC-enabled smartphones
- Perfect for: interactive displays, business cards, product packaging, retail signage
- Source tracked separately (QR scan vs NFC tap vs direct link)

### Use Cases
- Event programs and schedules
- Product packaging
- Business cards
- Museum and gallery exhibits
- Restaurant menus and daily specials
- Real estate listings
- Portfolio presentations
- Memorials and tribute plaques
- Faith organization bulletins
- Sports club programs and jerseys
- Conference badges

## 6. ANALYTICS & TRACKING

### Basic Analytics (Personal Single Use, Personal Life Events)
- Total views
- Views by source (QR, NFC, Direct)
- Device types
- Browser information

### Advanced Analytics (Org Events, Growth, Pro, Enterprise)
- Everything in Basic plus:
- Geographic data (country, city)
- Time-of-day activity patterns
- View trends over time
- Campaign performance comparisons
- Export data (CSV, PDF)

### Activity Feed (Org Events, Starter, Growth, Pro, Enterprise)
- Real-time feed of all scans and views
- Filter by date, campaign, device type
- Chronological event log

### What Gets Tracked (automatically, no setup needed)
- Scan timestamp (UTC)
- Geographic location (city, country — from IP)
- Device type (iPhone, Android, desktop, etc.)
- Browser (Chrome, Safari, Firefox, etc.)
- Operating system
- Source type (QR scan, NFC tap, or direct link)

## 7. TEAM MANAGEMENT & COLLABORATION

### Team Roles (3 roles)
- **ADMIN** — Full access to everything, can manage team, billing, settings
- **EDITOR** — Can create, edit, upload content, manage campaigns. Cannot manage billing or team.
- **VIEWER** — Can only view content and analytics. Cannot upload, edit, or delete.

### How Team Invitations Work
1. Organization owner or ADMIN goes to Contributors page
2. Enters team member's email address
3. Selects role (ADMIN, EDITOR, or VIEWER)
4. Selects which features the member can access (for VIEWER/EDITOR)
5. Member receives email invitation
6. Member clicks link, creates account, and joins the organization

### Feature Access Control
- Organization owners can restrict which features each team member can access
- ADMIN team members always have full access
- VIEWER/EDITOR access controlled via "allowedFeatures" during invitation
- Team members see the organization's dashboard (not their own)
- Team members share the organization's storage pool

### Role Request Feature
- VIEWERs can request a role upgrade (to EDITOR or ADMIN) from their dashboard
- Organization owner sees pending requests on Contributors page
- Owner can approve (immediately changes role) or dismiss

## 8. BILLING, PAYMENTS & SUBSCRIPTION MANAGEMENT

### Payment Methods
- Credit/Debit cards (Visa, Mastercard, Amex, and more)
- Secure checkout powered by Stripe
- Prices displayed in user's local currency (exchange rates updated hourly)

### Subscription Management (in Settings → Billing & Account)
- View current plan, status, and storage usage
- Auto-Renewal toggle (on/off)
- Edit billing/payment method (opens Stripe billing portal)
- View invoices and download receipts
- Cancel subscription
- Upgrade plan

### Coupon Codes
- Apply during checkout on Plans page
- Every plan card has "Have a coupon code?" button
- Percentage or fixed amount discounts

### Cancellation
- Cancel anytime from Settings → Billing & Account
- Within 7 days: Full automatic refund + immediate cancellation
- After 7 days: Cancellation only, no refund (access continues until period end)

### 7-Day Refund Policy
- ALL plans are eligible for a full refund within 7 days of subscribing
- To get a refund: Go to Settings → Billing & Account → Cancel Subscription
- Refund processes automatically within 5-10 business days
- IMPORTANT: Do NOT delete your account — this forfeits the refund. Always use "Cancel Subscription" instead.

### Annual Renewal Plans
**Personal Single Use:**
- First year: $69
- Year 2+: $10/year for continued viewing access
- 30-day and 7-day email reminders before expiry
- If not renewed within 7 days after expiry, account is suspended
- Renewal only extends access — no additional storage or features

**Org Events:**
- First year: $199
- Year 2+: $65/year renewal
- Same reminder and suspension schedule as above
- Renewal only extends access — no additional storage or features

### Reactivation
- Canceled users can reactivate from Settings → Billing & Account
- Creates a new Stripe subscription with same plan and pricing
- Immediate access restoration

## 9. ENTERPRISE FEATURES (Growth/Pro/Enterprise plans)

### Cohorts (Growth, Pro, Enterprise)
- Create audience groups/segments
- Add members individually or import in bulk
- Assign Streams/Campaigns to specific cohorts
- Track engagement per cohort
- Public cohort viewer page

### Organizations (Growth, Pro, Enterprise)
- Multi-organization management
- Separate content libraries per organization
- Organization-level analytics

### Workflows (Pro, Enterprise)
- Create automated workflows
- Draft, active, paused, completed statuses
- Task automation and scheduling

### Audit Log (Pro, Enterprise)
- Complete audit trail of all actions
- Who did what, when
- Filter by user, action type, date range

### Compliance (Enterprise only)
- Compliance reporting and monitoring
- Data governance tools
- Regulatory requirement tracking

### Security (Enterprise only)
- Advanced security settings
- Two-factor authentication (2FA)
- Enhanced access controls

## 10. MESSAGES / INBOX (Growth, Pro, Enterprise)

- Send messages to team members or audience members
- Message subjects and body text
- Read/unread status tracking
- Email notifications sent to recipients
- Organized inbox view

## 11. PUSH NOTIFICATIONS

- Available on all organization plans
- Users can opt-in to receive browser push notifications
- Campaign-specific push subscriptions
- Notifies audience when new content is added
- Works on desktop and mobile browsers

## 12. AI CHAT SUPPORT

- AI-powered instant responses available 24/7
- Located in the bottom-right corner of every page (chat widget)
- Powered by Groq AI (fast, accurate)
- Conversation history preserved
- Automatic escalation to human support for complex issues
- Human admin can take over any conversation from Admin Panel
- Feedback rating system (1-5 stars) when chat closes

## 13. LIVE CHAT WITH SUPPORT

- Available in Settings → Live Chat (or via AI chat escalation)
- Real-time messaging with support team
- File attachment support
- Conversation history
- Chat auto-closes after 15 minutes of inactivity
- Feedback modal after closing
- New chat button to start fresh conversation

## 14. SOCIAL SHARING & AMPLIFY

### Sharing Options (per item or campaign)
- Facebook
- Twitter/X
- LinkedIn
- WhatsApp
- Instagram
- Email
- Copy direct link
- Native share (on mobile)

### Amplify Feature (Organization plans)
- Share an item to multiple social platforms in one tap
- Opens each platform pre-filled with the OI link
- No API keys or permissions needed

### Share/Receive (PWA)
- Receive content shared TO OI from phone's share sheet
- Review and post directly to OI
- Then optionally amplify to social platforms

## 15. ACCOUNT & PROFILE

### Profile Management
- Update name
- Change password
- Upload/change profile picture
- View account email (cannot be changed)

### Delete Account
- Available in Profile page
- WARNING: Permanently deletes all data — uploads, QR codes, campaigns, analytics
- If you want a refund, cancel subscription FIRST via Billing & Account
- Deleting account forfeits any refund eligibility

### Notifications
- In-app notification panel (bell icon)
- Email notifications for: team invitations, new activity, subscription renewals, storage warnings, push subscriptions
- Push notification opt-in for campaign updates

## 16. STORAGE MANAGEMENT

### Storage Alerts
- 80% usage: Warning banner appears
- 90% usage: Elevated warning
- 95% usage: Critical alert — recommend cleanup or upgrade

### Increase Storage
- Purchase add-on packs without changing plan:
  - 50 GB — $4.99
  - 100 GB — $8.99
  - 200 GB — $14.99
- Available from Storage Alert banner or Settings

### Free Up Space
- Delete unused items
- Remove old campaigns/streams
- Check which items use the most storage in My Items page

## 17. ADMIN PANEL (Platform admins only)

### Admin Features
- Dashboard with real-time stats
- User management (view, edit, suspend, delete)
- User detail pages with full account info
- Item management (view all items across platform)
- Campaign management
- Live chat monitoring and response
- Feedback management (pending, reviewed, resolved)
- Revenue tracking and analytics
- Geography/location analytics
- Data exports (users, items, analytics)
- Discount/coupon code management
- Enterprise lead management
- Team management across organizations
- Admin settings (notification toggles, platform settings)
- Opportunities tracking

### Admin Roles
- **ADMIN** — Full platform access
- **CUSTOMER_SUPPORT** — Only Live Chat access (limited menu)

## 18. DATA COLLECTION & PRIVACY

### What Data We Collect
1. **User Information** — Name, email, profile photo (entered during signup)
2. **Organization Details** — Company name, industry, team size, website (entered during onboarding)
3. **QR Code Data** — QR code name, destination URL, created date, QR image (auto-generated)
4. **Scan Analytics** — Scan time (UTC), location (city/country from IP), device type, browser (collected automatically when someone scans)
5. **Messages & Communications** — Message text, recipient, sent date, read status (composed by user)
6. **Billing & Subscriptions** — Plan type, billing cycle, last 4 digits of card (payment tokens stored in Stripe only, never on our servers)

### Data Flow
1. User enters data via form, dashboard, or API
2. Client-side JavaScript validates format, required fields, length
3. Backend double-checks all validations for security
4. Data is processed, sanitized, and formatted
5. Stored securely in PostgreSQL database
6. Confirmation returned to user

### Security & Privacy
- All connections encrypted (HTTPS/TLS)
- Passwords hashed with bcrypt
- Payment data handled by Stripe (PCI compliant) — never stored on our servers
- Data stored in secure data centers
- GDPR compliant
- Regular security practices
- Optional 2FA for enterprise accounts

## 19. HOW TO GET STARTED

### Step-by-Step
1. Visit outboundimpact.net/plans
2. Choose a plan (Personal or Organization)
3. Create your account (email + password)
4. Complete payment via Stripe
5. You're in! Start uploading content from your Dashboard
6. Each upload gets a QR code and shareable link automatically
7. Print, share, or embed your QR codes anywhere
8. Track who scans in real-time from Analytics

### Common Workflows

**Creating a memorial:**
1. Sign up for Personal Single Use ($69)
2. Upload photos, videos, and messages
3. Create a Stream named after the person
4. Print QR code and place on headstone, tribute card, or program
5. Anyone who scans sees the memorial content — no app needed

**Running an event:**
1. Sign up for Org Events ($199)
2. Upload event content (schedule, speaker bios, maps, videos)
3. Create campaigns for each session/area
4. Print QR codes on badges, signage, and programs
5. Track engagement in real-time

**Growing a community (sports club, faith org, etc.):**
1. Sign up for Growth ($69/month)
2. Invite team members as contributors
3. Create campaigns for different content categories
4. Share QR codes on jerseys, bulletins, signage
5. Use cohorts to segment your audience
6. Send messages to specific groups
7. Monitor analytics to see what resonates

## 20. TECHNICAL SPECIFICATIONS

- Frontend: React with Vite, Tailwind CSS
- Backend: Node.js with Express, Prisma ORM
- Database: PostgreSQL
- CDN/Storage: Bunny.net (worldwide fast access)
- Hosting: Railway (backend), Vercel (frontend)
- Payments: Stripe (PCI compliant)
- Email: Professional SMTP (Resend)
- AI Chat: Groq AI (Llama 3.3 70B)
- Push Notifications: Web Push API

## 21. FREQUENTLY ASKED QUESTIONS

**Q: Do viewers need to download an app to see my content?**
A: No! Viewers just scan the QR code or tap the NFC tag and the content opens in their phone's browser. No app download required.

**Q: Can I change my plan later?**
A: Yes! You can upgrade anytime from Settings → Billing & Account. Your data and content are preserved.

**Q: What happens when my Personal Single Use or Org Events plan expires?**
A: You receive email reminders at 30 days and 7 days before expiry. After expiry, you have 7 days to renew ($10/year for Personal Single Use, $65/year for Org Events). If not renewed, your account is suspended but your data is preserved — you can reactivate by paying the renewal.

**Q: How do I get a refund?**
A: Within 7 days of subscribing, go to Settings → Billing & Account → Cancel Subscription. The refund is automatic (5-10 business days). Do NOT delete your account — that forfeits the refund.

**Q: Is my payment information safe?**
A: Absolutely. We use Stripe for payment processing. Your card details are never stored on our servers — they go directly to Stripe, which is PCI Level 1 certified.

**Q: Can I password-protect my content?**
A: Yes! When creating a Stream/Campaign, enable password protection. The QR code stays public but viewers need the password to access the content.

**Q: What's the difference between Streams and Campaigns?**
A: They're the same feature with different names. Personal plans see "Streams" and organization plans see "Campaigns."

**Q: How many files can I upload?**
A: All plans have unlimited uploads. The only constraint is your storage limit (25GB to 1.5TB+ depending on plan). You can purchase additional storage packs.

**Q: Can I use OI for a memorial?**
A: Yes, this is one of our most popular use cases. Upload photos, videos, and messages. Create a Stream, print the QR code, and place it on a headstone, plaque, tribute card, or memorial program. Visitors scan to see the tribute.

**Q: How do team members work?**
A: Organization plan owners can invite team members by email. Each member gets a role (Admin, Editor, or Viewer) that controls what they can do. Team members share the organization's storage and content library.

**Q: Can I see where people are scanning from?**
A: Yes! Analytics shows geographic data including country and city. You can also see device types, browsers, and time-of-day patterns.

**Q: What is the Amplify feature?**
A: Amplify lets organization users share content to multiple social platforms (Facebook, LinkedIn, WhatsApp, X, Instagram, Email) in one tap. Each platform opens pre-filled with your OI link.

**Q: How do push notifications work?**
A: Viewers can opt-in to receive browser push notifications for specific campaigns. When new content is added, subscribers get notified automatically.

**Q: What if I need more storage?**
A: You can purchase add-on packs (50GB for $4.99, 100GB for $8.99, 200GB for $14.99) without changing your plan. Or upgrade to a higher plan for more included storage.

**Q: How do I contact support?**
A: Use the AI chat widget (bottom-right corner of every page) for instant help. For complex issues, email support@outboundimpact.org. The AI can also escalate to a human agent.

**Q: What is a Cohort?**
A: Cohorts are audience groups/segments (available on Growth, Pro, Enterprise plans). You can create cohorts, add members, and assign specific campaigns to them for targeted content distribution.

**Q: What are Workflows?**
A: Workflows (Pro and Enterprise plans) are automated task sequences. Create workflows with specific triggers and actions to automate your content distribution and management processes.

**Q: Can I export my analytics data?**
A: Yes! Advanced Analytics (available on Org Events, Growth, Pro, Enterprise) includes export to CSV and PDF formats.

**Q: What happens to my QR codes if I cancel?**
A: After cancellation, your QR codes will stop working at the end of your billing period (for monthly plans) or at your expiry date (for annual plans). If you reactivate, they work again.

**Q: Is there a free trial?**
A: We don't offer a free trial, but we have a 7-day money-back guarantee on all plans. Try any plan risk-free — if it's not right for you, cancel within 7 days for a full refund.

**Q: Can I embed YouTube videos?**
A: Yes! Paste any YouTube URL (regular videos, Shorts, or playlists) into the embed upload, and it auto-converts to an embedded player. Also supports Vimeo, SoundCloud, Spotify, and Google Drive/Docs/Sheets/Slides.

**Q: What's the Enterprise plan?**
A: Enterprise is for organizations with 5,000+ members needing custom pricing, SLA guarantees, dedicated support, and white-label options. Click "Contact Us" on the Plans page to get started.
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
      model: 'llama-3.3-70b-versatile', // FREE! Fast! Powerful! (Updated model)
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
      model: 'llama-3.3-70b-versatile (FREE)',
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