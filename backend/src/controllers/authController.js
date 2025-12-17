const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createCheckoutSession, getCheckoutSession, upgradePlan } = require('../services/stripeService');

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

    // Get subscription details if it's a subscription plan
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
        ...subscriptionData, // Add period start/end and priceId
      }
    });

    delete global.pendingSignups[sessionId];

    // 🆕 SEND EMAILS IN BACKGROUND - DON'T WAIT FOR THEM!
    // This prevents signup from getting stuck
    setImmediate(async () => {
      try {
        const emailService = require('../services/emailService');
        
        // Try to send welcome email
        try {
          await emailService.sendWelcomeEmail(user.email, user.name, user.role);
          console.log('✅ Welcome email sent to:', user.email);
        } catch (emailError) {
          console.error('❌ Failed to send welcome email:', emailError.message);
        }

        // Try to send admin notification
        try {
          await emailService.sendAdminNotification({
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            subscriptionId: session.subscription
          });
          console.log('✅ Admin notification sent');
        } catch (emailError) {
          console.error('❌ Failed to send admin notification:', emailError.message);
        }
      } catch (error) {
        console.error('❌ Email service error:', error.message);
      }
    });

    // IMMEDIATELY RESPOND TO USER - DON'T WAIT FOR EMAILS!
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

// ✨ UPDATED: Sign in with enhanced team member detection
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

    // ✨ CRITICAL FIX: Check if user is a team member of any organization
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

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // ✨ CRITICAL FIX: If user is a team member, return organization info as PRIMARY
    if (teamMembership) {
      console.log(`✅ Team member signed in: ${user.email} (${teamMembership.role}) of ${teamMembership.user.name}`);

      return res.json({
        status: 'success',
        message: 'Sign in successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          role: user.role, // Keep personal role for reference
          storageUsed: user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
          // ✨ CRITICAL: Team member flags and organization data
          isTeamMember: true,
          teamRole: teamMembership.role, // VIEWER, EDITOR, or ADMIN
          organization: {
            id: teamMembership.user.id,
            name: teamMembership.user.name,
            email: teamMembership.user.email,
            role: teamMembership.user.role, // ORG_ENTERPRISE, etc.
            storageUsed: teamMembership.user.storageUsed.toString(),
            storageLimit: teamMembership.user.storageLimit.toString(),
            subscriptionStatus: teamMembership.user.subscriptionStatus,
            currentPeriodEnd: teamMembership.user.currentPeriodEnd,
          },
        },
      });
    }

    // Regular user sign in (not a team member)
    console.log(`✅ User signed in: ${user.email}`);

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
        // ✨ CRITICAL: Explicitly mark as NOT a team member
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

    // ✨ Check if user is a team member of any organization
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

    // ✨ If user is a team member, return organization info
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
          // ✨ Include team membership info
          isTeamMember: true,
          teamRole: teamMembership.role,
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

    // Regular user (not a team member)
    res.json({
      status: 'success',
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString(),
        // ✨ Indicate not a team member
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

/**
 * Upgrade user's subscription plan with prorated billing
 */
const handleUpgradePlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newPlan } = req.body; // ORG_SMALL, ORG_MEDIUM, ORG_ENTERPRISE

    console.log('=== UPGRADE PLAN REQUEST ===');
    console.log('User ID:', userId);
    console.log('New Plan:', newPlan);

    // Validate input
    if (!newPlan) {
      return res.status(400).json({
        status: 'error',
        message: 'New plan is required'
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is trying to "upgrade" to same plan
    if (user.role === newPlan) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already on this plan'
      });
    }

    // Determine new price ID and storage limit
    let newPriceId, newStorageLimit;
    
    switch (newPlan) {
      case 'ORG_SMALL':
        newPriceId = process.env.STRIPE_SMALL_ORG_PRICE;
        newStorageLimit = 10 * 1024 * 1024 * 1024; // 10GB
        break;
      case 'ORG_MEDIUM':
        newPriceId = process.env.STRIPE_MEDIUM_ORG_PRICE;
        newStorageLimit = 30 * 1024 * 1024 * 1024; // 30GB
        break;
      case 'ORG_ENTERPRISE':
        newPriceId = process.env.STRIPE_ENTERPRISE_PRICE;
        newStorageLimit = 100 * 1024 * 1024 * 1024; // 100GB
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid plan selected'
        });
    }

    console.log('New Price ID:', newPriceId);
    console.log('New Storage Limit:', newStorageLimit);

    // Perform upgrade in Stripe with prorated billing
    const upgradeResult = await upgradePlan(user, newPriceId, newPlan);

    console.log('Upgrade result:', upgradeResult);

    // Update user in database
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

    // Send upgrade confirmation email in background
    setImmediate(async () => {
      try {
        const emailService = require('../services/emailService');
        // You can create an upgrade email template later
        console.log('📧 Upgrade email would be sent to:', user.email);
      } catch (error) {
        console.error('Email error:', error);
      }
    });

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

module.exports = {
  createCheckout,
  completeSignup,
  signIn,
  getCurrentUser,
  handleUpgradePlan,
};