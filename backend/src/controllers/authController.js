const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createCheckoutSession, getCheckoutSession, upgradePlan } = require('../services/stripeService');
const { getSettings, isNotificationEnabled, fireWebhook } = require('../services/settingsHelper');
const { notifyAdminNewCustomer, notifyAdminPlanUpgrade } = require('../services/adminNotificationService');

// Helper function to send 2FA login email
const send2FALoginEmail = async (userEmail, userName, code) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping 2FA email');
      return { success: false };
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [userEmail],
      subject: '🔒 Your Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; }
            .code-box { background: #f0f0ff; border: 3px dashed #800080; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #800080; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔒 Login Verification</h1>
            </div>
            <div class="content">
              <h2 style="color: #800080;">Hi ${userName}! 👋</h2>
              <p>Someone just tried to sign in to your <strong>Outbound Impact</strong> account. Here's your verification code:</p>
              <div class="code-box">
                <div class="code">${code}</div>
                <p style="margin: 10px 0 0 0; color: #666;">Enter this code to complete sign in</p>
              </div>
              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This code expires in <strong>10 minutes</strong></li>
                  <li>Never share this code with anyone</li>
                  <li>If you didn't try to sign in, please ignore this email</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send 2FA login email:', error);
      return { success: false };
    }

    console.log('✅ 2FA login email sent to:', userEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false };
  }
};

// Create checkout session
const createCheckout = async (req, res) => {
  try {
    const { email, name, password, plan, enterpriseConfig, couponCode } = req.body;

    // ✅ Check if new registrations are allowed (via platform settings)
    try {
      const platformSettings = await getSettings();
      if (platformSettings.allowRegistrations === false) {
        return res.status(403).json({
          status: 'error',
          message: `New registrations are currently disabled. Please contact ${platformSettings.supportEmail || 'support@outboundimpact.org'}.`
        });
      }
    } catch (e) { /* defaults allow registration */ }

    // ✅ Log coupon code if provided
    if (couponCode) {
      console.log('🎫 Coupon code received from frontend:', couponCode);
    }

    if (!email || !name || !password || !plan) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    let priceId, role, storageLimit;
    
    switch (plan) {
      case 'INDIVIDUAL':
        priceId = process.env.STRIPE_INDIVIDUAL_PRICE;
        role = 'INDIVIDUAL';
        storageLimit = 25 * 1024 * 1024 * 1024; // 25GB — Personal Single Use
        break;
      case 'PERSONAL_LIFE':
        priceId = process.env.STRIPE_PERSONAL_LIFE_PRICE;
        role = 'PERSONAL_LIFE';
        storageLimit = 100 * 1024 * 1024 * 1024; // 100GB — Personal Life Events
        break;
      case 'ORG_EVENTS':
        priceId = process.env.STRIPE_ORG_EVENTS_PRICE;
        role = 'ORG_EVENTS';
        storageLimit = 250 * 1024 * 1024 * 1024; // 250GB — Org Events
        break;
      case 'ORG_SMALL':
        priceId = process.env.STRIPE_SMALL_ORG_PRICE;
        role = 'ORG_SMALL';
        storageLimit = 100 * 1024 * 1024 * 1024; // 100GB — Starter
        break;
      case 'ORG_MEDIUM':
        priceId = process.env.STRIPE_MEDIUM_ORG_PRICE;
        role = 'ORG_MEDIUM';
        storageLimit = 250 * 1024 * 1024 * 1024; // 250GB — Growth
        break;
      case 'ORG_SCALE':
        priceId = process.env.STRIPE_SCALE_ORG_PRICE;
        role = 'ORG_SCALE';
        storageLimit = 500 * 1024 * 1024 * 1024; // 500GB — Pro
        break;
      case 'ORG_ENTERPRISE':
        role = 'ORG_ENTERPRISE';
        
        // ✅ For Enterprise, create a custom price based on configuration
        if (enterpriseConfig && enterpriseConfig.calculatedPrice) {
          console.log('🏢 Enterprise plan with custom pricing:', {
            storageGB: enterpriseConfig.storageGB,
            teamMembers: enterpriseConfig.teamMembers,
            calculatedPrice: enterpriseConfig.calculatedPrice
          });
          
          // We'll create a dynamic price - set priceId to null for now
          // and handle it specially in createCheckoutSession
          priceId = null;
          storageLimit = enterpriseConfig.storageGB * 1024 * 1024 * 1024;
        } else {
          // Fallback to base Enterprise price
          priceId = process.env.STRIPE_ENTERPRISE_PRICE;
          storageLimit = 1500 * 1024 * 1024 * 1024;
        }
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid plan selected'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ✅ For Enterprise plans, pass the entire config for dynamic pricing
    const session = await createCheckoutSession(
      normalizedEmail, 
      priceId, 
      plan, 
      couponCode,
      enterpriseConfig  // Pass enterprise config for dynamic pricing
    );

    global.pendingSignups = global.pendingSignups || {};
    global.pendingSignups[session.id] = {
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role,
      storageLimit,
      plan,
      enterpriseConfig: enterpriseConfig || null
    };

    res.json({
      status: 'success',
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create checkout session'
    });
  }
};

/**
 * ✅ FIXED: Handle race condition where webhook creates user before frontend calls this
 */
const completeSignup = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID required'
      });
    }

    const session = await getCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment not completed'
      });
    }

    // ✅ FIX: Get customer email from session
    const customerEmail = (session.customer_email || session.customer_details?.email)?.toLowerCase().trim();

    if (!customerEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer email not found in session'
      });
    }

    // ✅ FIX: Check if user already exists (created by webhook)
    let user = await prisma.user.findUnique({
      where: { email: customerEmail }
    });

    // ✅ If user exists, webhook already created them - just log them in
    if (user) {
      console.log('✅ User already created by webhook, logging in:', user.email);

      // ✅ Mark email as verified (they completed payment = valid email)
      try {
        await prisma.$executeRaw`UPDATE "User" SET "emailVerified" = true WHERE "id" = ${user.id}`;
      } catch (e) { /* column may not exist */ }

      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken(user.id);

      return res.json({
        status: 'success',
        message: 'Account created successfully',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          role: user.role,
          storageUsed: user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
        }
      });
    }

    // ✅ If user doesn't exist, check if this is an enterprise lead checkout
    const sessionMetadata = session.metadata || {};
    if (sessionMetadata.leadId) {
      console.log('🏢 Enterprise lead checkout detected, leadId:', sessionMetadata.leadId);

      // ── Re-check: webhook may have already created the user between our
      //    first check above and now (race condition) ──────────────────────
      const existingUser = await prisma.user.findUnique({ where: { email: customerEmail } });
      if (existingUser) {
        console.log('✅ Webhook already created enterprise user, logging in:', existingUser.email);
        const accessToken  = generateAccessToken(existingUser.id, existingUser.email, existingUser.role);
        const refreshToken = generateRefreshToken(existingUser.id);
        return res.json({
          status: 'success',
          message: 'Account activated successfully!',
          accessToken,
          refreshToken,
          user: {
            id:           existingUser.id,
            email:        existingUser.email,
            name:         existingUser.name,
            profilePicture: existingUser.profilePicture,
            role:         existingUser.role,
            storageUsed:  existingUser.storageUsed.toString(),
            storageLimit: existingUser.storageLimit.toString(),
          }
        });
      }

      // Fetch lead data — use saved hashed password from signup form
      let leadName = 'Enterprise Customer';
      let leadPasswordHash = null;
      try {
        const leadData = await prisma.enterpriseLead.findUnique({
          where: { id: sessionMetadata.leadId },
          select: { name: true, signupPasswordHash: true }
        });
        if (leadData) {
          leadName         = leadData.name;
          leadPasswordHash = leadData.signupPasswordHash;
        }
      } catch (e) {
        console.error('⚠️ Could not fetch lead data:', e.message);
      }

      // Use saved password hash — or temp if somehow missing
      let hashedPassword = leadPasswordHash;
      if (!hashedPassword) {
        const crypto = require('crypto');
        const bcrypt = require('bcryptjs');
        hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      }

      // Calculate storage limit from metadata
      const storageGB = parseInt(sessionMetadata.storageGB) || 1500;
      const storageLimit = BigInt(storageGB) * BigInt(1024 * 1024 * 1024);

      let subscriptionData = {};
      if (session.subscription) {
        const stripeLib = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const subscription = await stripeLib.subscriptions.retrieve(session.subscription);
        subscriptionData = {
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd:   new Date(subscription.current_period_end   * 1000),
          priceId:            subscription.items.data[0].price.id,
        };
      }

      // Track if we created vs fetched (to avoid double welcome email)
      let justCreated = true;
      try {
        user = await prisma.user.create({
          data: {
            email:            customerEmail,
            name:             leadName,
            password:         hashedPassword,
            role:             'ORG_ENTERPRISE',
            storageLimit,
            stripeCustomerId: session.customer,
            subscriptionId:   session.subscription || null,
            subscriptionStatus: 'active',
            emailVerified:    true,
            ...subscriptionData,
          }
        });
      } catch (createErr) {
        // P2002 = unique constraint — webhook already created the user
        if (createErr.code === 'P2002') {
          console.log('ℹ️ User already created by webhook (race condition), fetching...');
          user = await prisma.user.findUnique({ where: { email: customerEmail } });
          if (!user) throw createErr;
          justCreated = false; // webhook already sent welcome email
        } else {
          throw createErr;
        }
      }

      // Update lead status to converted
      try {
        await prisma.enterpriseLead.update({
          where: { id: sessionMetadata.leadId },
          data:  { status: 'converted' }
        });
      } catch (e) {}

      console.log(`${justCreated ? '✅ Enterprise user created' : 'ℹ️ Enterprise user already existed'}: ${user.email}`);

      // Only send welcome email if we created the user here —
      // webhook already sent it if it won the race
      if (justCreated) {
        setImmediate(async () => {
          try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeEmail(user.email, user.name, 'ORG_ENTERPRISE');
            console.log('✅ Enterprise welcome email sent to:', user.email);
          } catch (e) {
            console.error('⚠️ Enterprise welcome email error:', e.message);
          }
        });
      }

      const accessToken  = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken(user.id);

      return res.json({
        status: 'success',
        message: 'Enterprise account created! Check your email to set your password.',
        accessToken,
        refreshToken,
        user: {
          id:           user.id,
          email:        user.email,
          name:         user.name,
          profilePicture: user.profilePicture,
          role:         user.role,
          storageUsed:  user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
        }
      });
    }

    // ✅ Regular signup fallback — check pendingSignups
    const signupData = global.pendingSignups?.[sessionId];

    if (!signupData) {
      return res.status(400).json({
        status: 'error',
        message: 'Signup data not found. Please try signing in with your email and password.'
      });
    }

    const normalizedEmail = signupData.email.toLowerCase().trim();

    let subscriptionData = {};
    if (session.subscription) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      subscriptionData = {
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: subscription.items.data[0].price.id,
      };
    }

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: signupData.name,
        password: signupData.password,
        role: signupData.role,
        storageLimit: signupData.storageLimit,
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription || null,
        subscriptionStatus: 'active',
        emailVerified: true,  // ✅ Verified — they completed Stripe payment
        ...subscriptionData,
      }
    });

    delete global.pendingSignups[sessionId];

    setImmediate(async () => {
      try {
        const emailService = require('../services/emailService');
        
        try {
          await emailService.sendWelcomeEmail(user.email, user.name, user.role);
          console.log('✅ Welcome email sent to:', user.email);
        } catch (emailError) {
          console.error('❌ Failed to send welcome email:', emailError.message);
        }

        // ⏳ Respect Resend rate limit (2 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ✅ Send payment receipt email
        try {
          const amount = session.amount_total ? (session.amount_total / 100) : 0;
          const currency = session.currency ? session.currency.toUpperCase() : 'USD';
          
          const planNames = {
            INDIVIDUAL: 'Personal Single Use',
            PERSONAL_LIFE: 'Personal Life Events',
            ORG_EVENTS: 'Org Events',
            ORG_SMALL: 'Starter',
            ORG_MEDIUM: 'Growth',
            ORG_SCALE: 'Pro',
            ORG_ENTERPRISE: 'Enterprise',
          };
          const planName = planNames[user.role] || user.role || 'Individual';

          if (amount > 0) {
            await emailService.sendPaymentReceiptEmail(
              user.email,
              user.name,
              amount,
              currency,
              planName
            );
            console.log('✅ Payment receipt sent to:', user.email, '- Amount:', amount, currency);
          } else {
            console.log('⚠️ Skipping receipt email - amount is 0');
          }
        } catch (emailError) {
          console.error('❌ Failed to send payment receipt:', emailError.message);
        }

        // ⏳ Respect Resend rate limit (2 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          if (await isNotificationEnabled('new_customer')) {
            const isOneTimePayment = user.role === 'INDIVIDUAL' || user.role === 'ORG_EVENTS';
            await emailService.sendAdminNotification({
              userName: user.name,
              userEmail: user.email,
              userRole: user.role,
              amount: session.amount_total ? (session.amount_total / 100) : 0,
              subscriptionId: session.subscription,
              paymentType: isOneTimePayment ? 'one-time' : 'subscription'
            });
            console.log('✅ Admin notification sent');
          } else {
            console.log('ℹ️ Admin new-customer notification disabled in settings');
          }
        } catch (emailError) {
          console.error('❌ Failed to send admin notification:', emailError.message);
        }

        // Fire webhook for new user signup
        fireWebhook('user.created', { userId: user.id, email: user.email, role: user.role, name: user.name });

        // ─── Notify admins: new customer signed up ───
        await notifyAdminNewCustomer(user.name, user.email, user.role);
      } catch (error) {
        console.error('❌ Email service error:', error.message);
      }
    });

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      status: 'success',
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
      }
    });

  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete signup'
    });
  }
};

// ✅ SIGN IN WITH 2FA ENFORCEMENT
const signIn = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const platformSettings = await getSettings();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // ═══ ENFORCEMENT: Login Attempt Limits ═══
    if (platformSettings.loginAttemptLimit) {
      try {
        const lockedUntilRows = await prisma.$queryRaw`SELECT "lockedUntil", "failedLoginAttempts" FROM "User" WHERE "id" = ${user.id}`;
        const lockedUntil = lockedUntilRows[0]?.lockedUntil;
        if (lockedUntil && new Date(lockedUntil) > new Date()) {
          const minutesLeft = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
          return res.status(429).json({
            status: 'error',
            code: 'ACCOUNT_LOCKED',
            message: `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
          });
        }
      } catch (e) { /* columns may not exist yet */ }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // ═══ ENFORCEMENT: Track failed attempts ═══
      if (platformSettings.loginAttemptLimit) {
        try {
          const currentAttempts = await prisma.$queryRaw`SELECT "failedLoginAttempts" FROM "User" WHERE "id" = ${user.id}`;
          const attempts = (currentAttempts[0]?.failedLoginAttempts || 0) + 1;
          if (attempts >= 5) {
            // Lock for 15 minutes
            await prisma.$executeRaw`UPDATE "User" SET "failedLoginAttempts" = ${attempts}, "lockedUntil" = ${new Date(Date.now() + 15 * 60 * 1000)} WHERE "id" = ${user.id}`;
            console.log(`🔒 Account locked after ${attempts} failed attempts: ${user.email}`);
            return res.status(429).json({
              status: 'error',
              code: 'ACCOUNT_LOCKED',
              message: 'Account locked for 15 minutes due to too many failed login attempts.'
            });
          } else {
            await prisma.$executeRaw`UPDATE "User" SET "failedLoginAttempts" = ${attempts} WHERE "id" = ${user.id}`;
          }
        } catch (e) { /* columns may not exist yet */ }
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // ═══ Password correct — reset failed attempts ═══
    if (platformSettings.loginAttemptLimit) {
      try {
        await prisma.$executeRaw`UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE "id" = ${user.id}`;
      } catch (e) { /* columns may not exist yet */ }
    }

    // ═══ Check account status ═══
    if (user.status === 'deleted' || user.status === 'inactive') {
      return res.status(401).json({
        status: 'error',
        message: 'This account has been deactivated. Please contact support.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_SUSPENDED',
        message: `Your account has been suspended. Please contact ${platformSettings.supportEmail || 'support@outboundimpact.org'} for assistance.`
      });
    }

    // ═══ ENFORCEMENT: Email Verification ═══
    if (platformSettings.requireEmailVerification) {
      try {
        const verifiedRows = await prisma.$queryRaw`SELECT "emailVerified" FROM "User" WHERE "id" = ${user.id}`;
        if (verifiedRows[0]?.emailVerified === false) {
          return res.status(403).json({
            status: 'error',
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before signing in. Check your inbox for the verification link.'
          });
        }
      } catch (e) { /* column may not exist — allow through */ }
    }

    // ═══ ENFORCEMENT: 2FA Required for Admin Accounts ═══
    const needs2FA = user.twoFactorEnabled ||
      (platformSettings.twoFactorRequired && user.role === 'ADMIN');

    if (needs2FA) {
      if (!twoFactorCode) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // ✅ FIX: Store expiry INSIDE twoFactorSecret as "code|expiry" to avoid
        // colliding with resetTokenExpiry (used by the password reset flow).
        const twoFAExpiry = Date.now() + 10 * 60 * 1000; // 10 min
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorSecret: `${code}|${twoFAExpiry}`,
            // ✅ DO NOT touch resetTokenExpiry here
          }
        });
        await send2FALoginEmail(user.email, user.name, code);
        return res.status(200).json({
          status: 'success',
          message: '2FA verification code sent to your email',
          requires2FA: true
        });
      }

      // ✅ FIX: Parse code and expiry from twoFactorSecret field
      const storedSecret = user.twoFactorSecret || '';
      const [storedCode, storedExpiry] = storedSecret.includes('|')
        ? storedSecret.split('|')
        : [storedSecret, null];

      if (storedCode !== twoFactorCode) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid 2FA code'
        });
      }

      if (storedExpiry && Date.now() > Number(storedExpiry)) {
        return res.status(401).json({
          status: 'error',
          message: '2FA code expired. Please sign in again.'
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: null }
        // ✅ DO NOT touch resetTokenExpiry here
      });
    }

    // ═══ Continue with normal sign in ═══
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        memberUserId: user.id,
        status: 'ACCEPTED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            storageUsed: true,
            storageLimit: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    // Session timeout is enforced in auth.js middleware (checks token iat age)
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login
    try {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    } catch (e) { /* non-critical */ }

    // ═══ ENFORCEMENT: Fire webhook ═══
    fireWebhook('user.login', { userId: user.id, email: user.email, role: user.role });


    // Fetch session timeout for frontend SessionGuard
    let sessionTimeoutMinutes = null;
    try {
      const platformSettingsForTimeout = await getSettings();
      sessionTimeoutMinutes = platformSettingsForTimeout.sessionTimeoutMinutes || null;
    } catch (e) { /* non-critical */ }

    if (teamMembership) {
      console.log(`✅ Team member signed in: ${user.email} (${teamMembership.role}) of ${teamMembership.user.name}`);

      return res.json({
        status: 'success',
        message: 'Sign in successful',
        accessToken,
        refreshToken,
        sessionTimeoutMinutes,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          role: user.role,
          storageUsed: user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
          isTeamMember: true,
          teamRole: teamMembership.role,
          allowedFeatures: teamMembership.allowedFeatures || null,
          organization: {
            id: teamMembership.user.id,
            name: teamMembership.user.name,
            email: teamMembership.user.email,
            role: teamMembership.user.role,
            storageUsed: teamMembership.user.storageUsed.toString(),
            storageLimit: teamMembership.user.storageLimit.toString(),
            subscriptionStatus: teamMembership.user.subscriptionStatus,
            currentPeriodEnd: teamMembership.user.currentPeriodEnd,
          },
        },
      });
    }

    console.log(`✅ User signed in: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Sign in successful',
      accessToken,
      refreshToken,
      sessionTimeoutMinutes,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
        subscriptionStatus: user.subscriptionStatus,  // ✅ Added
        subscriptionId: user.subscriptionId,          // ✅ Added
        currentPeriodStart: user.currentPeriodStart,  // ✅ Added
        currentPeriodEnd: user.currentPeriodEnd,      // ✅ Added
        priceId: user.priceId,                        // ✅ Added
        isTeamMember: false,
      }
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Sign in failed'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        memberUserId: user.id,
        status: 'ACCEPTED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            storageUsed: true,
            storageLimit: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (teamMembership) {
      return res.json({
        status: 'success',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          role: user.role,
          storageUsed: user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
          subscriptionStatus: user.subscriptionStatus,
          currentPeriodEnd: user.currentPeriodEnd,
          isTeamMember: true,
          teamRole: teamMembership.role,
          allowedFeatures: teamMembership.allowedFeatures || null,
          organization: {
            id: teamMembership.user.id,
            name: teamMembership.user.name,
            email: teamMembership.user.email,
            role: teamMembership.user.role,
            storageUsed: teamMembership.user.storageUsed.toString(),
            storageLimit: teamMembership.user.storageLimit.toString(),
            subscriptionStatus: teamMembership.user.subscriptionStatus,
            currentPeriodEnd: teamMembership.user.currentPeriodEnd,
          },
        }
      });
    }

    res.json({
      status: 'success',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
        isTeamMember: false,
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user'
    });
  }
};

const handleUpgradePlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newPlan } = req.body;

    if (!newPlan) {
      return res.status(400).json({
        status: 'error',
        message: 'New plan is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.role === newPlan) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already on this plan'
      });
    }

    let newPriceId, newStorageLimit;
    
    switch (newPlan) {
      case 'PERSONAL_LIFE':
        newPriceId = process.env.STRIPE_PERSONAL_LIFE_PRICE;
        newStorageLimit = 100 * 1024 * 1024 * 1024;
        break;
      case 'ORG_EVENTS':
        newPriceId = process.env.STRIPE_ORG_EVENTS_PRICE;
        newStorageLimit = 250 * 1024 * 1024 * 1024;
        break;
      case 'ORG_SMALL':
        newPriceId = process.env.STRIPE_SMALL_ORG_PRICE;
        newStorageLimit = 100 * 1024 * 1024 * 1024;
        break;
      case 'ORG_MEDIUM':
        newPriceId = process.env.STRIPE_MEDIUM_ORG_PRICE;
        newStorageLimit = 250 * 1024 * 1024 * 1024;
        break;
      case 'ORG_SCALE':
        newPriceId = process.env.STRIPE_SCALE_ORG_PRICE;
        newStorageLimit = 500 * 1024 * 1024 * 1024;
        break;
      case 'ORG_ENTERPRISE':
        newPriceId = process.env.STRIPE_ENTERPRISE_PRICE;
        newStorageLimit = 1500 * 1024 * 1024 * 1024;
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid plan selected'
        });
    }

    const upgradeResult = await upgradePlan(user, newPriceId, newPlan);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newPlan,
        storageLimit: newStorageLimit,
        subscriptionId: upgradeResult.subscriptionId,
        subscriptionStatus: upgradeResult.status,
        priceId: upgradeResult.priceId,
        currentPeriodStart: upgradeResult.currentPeriodStart,
        currentPeriodEnd: upgradeResult.currentPeriodEnd,
      }
    });

    console.log('✅ User upgraded successfully');

    // ═══ Send upgrade receipt + admin notification emails ═══
    const planNames = {
      INDIVIDUAL: 'Personal Single Use',
      PERSONAL_LIFE: 'Personal Life Events',
      ORG_EVENTS: 'Org Events',
      ORG_SMALL: 'Starter',
      ORG_MEDIUM: 'Growth',
      ORG_SCALE: 'Pro',
      ORG_ENTERPRISE: 'Enterprise',
    };

    try {
      const emailService = require('../services/emailService');
      
      // Send upgrade receipt to user
      await emailService.sendUpgradeReceiptEmail({
        email: updatedUser.email,
        name: updatedUser.name || 'Valued Customer',
        oldPlan: planNames[user.role] || user.role,
        newPlan: planNames[newPlan] || newPlan,
        amountCharged: upgradeResult.proratedAmount || 0,
        creditApplied: upgradeResult.creditApplied || 0,
        nextBillingDate: upgradeResult.currentPeriodEnd,
      });
      console.log('📧 Upgrade receipt email sent to:', updatedUser.email);

      // Send admin notification (if enabled in settings)
      if (await isNotificationEnabled('new_customer')) {
        await emailService.sendAdminNotification({
          userName: updatedUser.name,
          userEmail: updatedUser.email,
          plan: newPlan,
          amount: upgradeResult.proratedAmount,
          subscriptionId: upgradeResult.subscriptionId,
        });
        console.log('📧 Admin upgrade notification sent');
      }

      // Fire webhook for plan upgrade
      fireWebhook('user.upgraded', { userId: updatedUser.id, email: updatedUser.email, newPlan });

      // ─── Notify admins: plan upgrade ───
      await notifyAdminPlanUpgrade(updatedUser.name, updatedUser.email, planNames[user.role] || user.role, planNames[newPlan] || newPlan);
    } catch (emailError) {
      console.error('❌ Failed to send upgrade emails:', emailError.message);
      // Don't fail the upgrade just because email failed
    }

    res.json({
      status: 'success',
      message: 'Plan upgraded successfully!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        storageLimit: updatedUser.storageLimit.toString(),
        storageUsed: updatedUser.storageUsed.toString(),
      },
      upgrade: {
        oldPlan: user.role,
        newPlan: newPlan,
        proratedAmount: upgradeResult.proratedAmount,
        creditApplied: upgradeResult.creditApplied || 0,
        nextBillingDate: upgradeResult.currentPeriodEnd,
      }
    });

  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upgrade plan'
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      console.log(`⚠️ Password reset requested for non-existent email: ${normalizedEmail}`);
      return res.json({
        status: 'success',
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // ✅ 24 hours (was 1 hour)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: resetTokenExpiry
      }
    });

    const { sendPasswordResetEmail } = require('../services/emailService');
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendPasswordResetEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      resetLink: resetLink
    });

    console.log(`✅ Password reset email sent to: ${user.email}`);

    res.json({
      status: 'success',
      message: 'If an account exists with this email, you will receive password reset instructions.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process password reset request'
    });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset token is required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log(`🔑 Verifying reset token (hash prefix: ${hashedToken.slice(0, 12)}...)`);

    // Check without expiry first, to give a clearer error message
    const userAny = await prisma.user.findFirst({
      where: { resetToken: hashedToken },
      select: { id: true, email: true, resetTokenExpiry: true }
    });

    if (!userAny) {
      console.log('❌ Reset token not found in DB — token is invalid or already used');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    if (!userAny.resetTokenExpiry || new Date() > userAny.resetTokenExpiry) {
      console.log(`❌ Reset token expired for ${userAny.email} — expired at ${userAny.resetTokenExpiry}`);
      return res.status(400).json({
        status: 'error',
        message: 'This reset link has expired. Please request a new one.'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gte: new Date() }
      },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    console.log(`✅ Reset token valid for: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Token is valid',
      user: {
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify reset token'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gte: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// SESSION STATUS — Lightweight endpoint for frontend SessionGuard
// Protected by authMiddleware → returns 401 if expired, 403 if suspended
// ═══════════════════════════════════════════════════════════
const getSessionStatus = async (req, res) => {
  try {
    const platformSettings = await getSettings();
    res.json({
      status: 'active',
      sessionTimeoutMinutes: platformSettings.sessionTimeoutMinutes || null,
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.json({ status: 'active', sessionTimeoutMinutes: null });
  }
};

// ═══════════════════════════════════════════════════════════
// ✅ SEND EMAIL VERIFICATION CODE
// Called when user tries to sign in but emailVerified is false
// Sends a 6-digit code to their email, stores it in twoFactorSecret
// ═══════════════════════════════════════════════════════════
const sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ status: 'success', message: 'If an account exists, a verification code has been sent.' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code + expiry (reuse twoFactorSecret and resetTokenExpiry fields)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: code,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      }
    });

    // Send verification email
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('⚠️ Resend not configured - skipping verification email');
        return res.json({ status: 'success', message: 'Verification code sent to your email.' });
      }

      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'Outbound Impact <noreply@outboundimpact.org>',
        to: [normalizedEmail],
        subject: '✉️ Verify Your Email Address',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; }
              .code-box { background: #f0f0ff; border: 3px dashed #800080; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
              .code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #800080; font-family: 'Courier New', monospace; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://outboundimpact.net/android-chrome-192x192.png" alt="Outbound Impact" style="width:60px;height:60px;display:block;margin:0 auto 15px;border-radius:12px;" />
                <h1 style="margin: 0;">✉️ Email Verification</h1>
              </div>
              <div class="content">
                <h2 style="color: #800080;">Hi ${user.name}! 👋</h2>
                <p>Please verify your email address by entering the code below:</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                  <p style="margin: 10px 0 0 0; color: #666;">This code expires in 15 minutes</p>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      console.log('✅ Verification email sent to:', normalizedEmail);
    } catch (emailErr) {
      console.error('❌ Failed to send verification email:', emailErr.message);
    }

    res.json({ status: 'success', message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send verification code' });
  }
};

// ═══════════════════════════════════════════════════════════
// ✅ VERIFY EMAIL CODE
// User enters the 6-digit code → sets emailVerified = true
// ═══════════════════════════════════════════════════════════
const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ status: 'error', message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Invalid email or code' });
    }

    // Check code matches
    if (user.twoFactorSecret !== code) {
      return res.status(400).json({ status: 'error', message: 'Invalid verification code' });
    }

    // Check expiry
    if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ status: 'error', message: 'Verification code has expired. Please request a new one.' });
    }

    // ✅ Mark email as verified and clear the code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        twoFactorSecret: null,
        resetTokenExpiry: null,
      }
    });

    console.log('✅ Email verified for:', normalizedEmail);
    res.json({ status: 'success', message: 'Email verified successfully! You can now sign in.' });
  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to verify email' });
  }
};

module.exports = {
  createCheckout,
  completeSignup,
  signIn,
  getCurrentUser,
  handleUpgradePlan,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  getSessionStatus,
  sendVerificationCode,
  verifyEmailCode,
};