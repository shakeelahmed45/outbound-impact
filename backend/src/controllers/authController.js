const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createCheckoutSession, getCheckoutSession } = require('../services/stripeService');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

// Create checkout session
const createCheckout = async (req, res) => {
  try {
    const { email, name, password, plan, enterpriseConfig } = req.body;

    // DEBUG LOGGING
    console.log('=== CHECKOUT REQUEST DEBUG ===');
    console.log('Received plan:', plan);
    console.log('Enterprise config:', enterpriseConfig);
    console.log('Environment variables:');
    console.log('- STRIPE_INDIVIDUAL_PRICE:', process.env.STRIPE_INDIVIDUAL_PRICE);
    console.log('- STRIPE_SMALL_ORG_PRICE:', process.env.STRIPE_SMALL_ORG_PRICE);
    console.log('- STRIPE_MEDIUM_ORG_PRICE:', process.env.STRIPE_MEDIUM_ORG_PRICE);
    console.log('- STRIPE_ENTERPRISE_PRICE:', process.env.STRIPE_ENTERPRISE_PRICE);
    console.log('==============================');

    if (!email || !name || !password || !plan) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
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
        storageLimit = 2 * 1024 * 1024 * 1024;
        break;
      case 'ORG_SMALL':
        priceId = process.env.STRIPE_SMALL_ORG_PRICE;
        role = 'ORG_SMALL';
        storageLimit = 10 * 1024 * 1024 * 1024;
        break;
      case 'ORG_MEDIUM':
        priceId = process.env.STRIPE_MEDIUM_ORG_PRICE;
        role = 'ORG_MEDIUM';
        storageLimit = 30 * 1024 * 1024 * 1024;
        break;
      case 'ORG_ENTERPRISE':
        console.log('Matched ORG_ENTERPRISE case!');
        priceId = process.env.STRIPE_ENTERPRISE_PRICE;
        role = 'ORG_ENTERPRISE';
        // Use custom storage from enterprise config or default to 100GB
        if (enterpriseConfig && enterpriseConfig.storageGB) {
          storageLimit = enterpriseConfig.storageGB * 1024 * 1024 * 1024;
        } else {
          storageLimit = 100 * 1024 * 1024 * 1024;
        }
        console.log('Enterprise priceId:', priceId);
        console.log('Enterprise storageLimit:', storageLimit);
        break;
      default:
        console.log('No plan matched! Received plan value:', plan, 'Type:', typeof plan);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid plan selected'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const session = await createCheckoutSession(email, priceId, plan);

    global.pendingSignups = global.pendingSignups || {};
    global.pendingSignups[session.id] = {
      email,
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

    const signupData = global.pendingSignups?.[sessionId];

    if (!signupData) {
      return res.status(400).json({
        status: 'error',
        message: 'Signup data not found'
      });
    }

    const user = await prisma.user.create({
      data: {
        email: signupData.email,
        name: signupData.name,
        password: signupData.password,
        role: signupData.role,
        storageLimit: signupData.storageLimit,
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription || null,
        subscriptionStatus: 'active',
      }
    });

    delete global.pendingSignups[sessionId];

    // 🆕 SEND WELCOME EMAIL TO USER
    try {
      await emailService.sendWelcomeEmail(user.email, user.name, user.role);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
      // Don't fail signup if email fails
    }

    // 🆕 SEND ADMIN NOTIFICATION
    try {
      await emailService.sendAdminNotification({
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        subscriptionId: session.subscription
      });
      console.log('✅ Admin notification sent');
    } catch (emailError) {
      console.error('❌ Failed to send admin notification:', emailError);
      // Don't fail signup if email fails
    }

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

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      status: 'success',
      message: 'Sign in successful',
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
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
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

module.exports = {
  createCheckout,
  completeSignup,
  signIn,
  getCurrentUser,
};