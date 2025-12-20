const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createCheckoutSession, getCheckoutSession, upgradePlan } = require('../services/stripeService');

// Create checkout session
const createCheckout = async (req, res) => {
  try {
    const { email, name, password, plan, enterpriseConfig } = req.body;

    console.log('=== CHECKOUT REQUEST DEBUG ===');
    console.log('Received plan:', plan);
    console.log('Enterprise config:', enterpriseConfig);
    console.log('==============================');

    if (!email || !name || !password || !plan) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // ✅ NORMALIZE EMAIL TO LOWERCASE
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail } // ✅ Use normalized email
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
        priceId = process.env.STRIPE_ENTERPRISE_PRICE;
        role = 'ORG_ENTERPRISE';
        if (enterpriseConfig && enterpriseConfig.storageGB) {
          storageLimit = enterpriseConfig.storageGB * 1024 * 1024 * 1024;
        } else {
          storageLimit = 100 * 1024 * 1024 * 1024;
        }
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid plan selected'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const session = await createCheckoutSession(normalizedEmail, priceId, plan); // ✅ Use normalized email

    global.pendingSignups = global.pendingSignups || {};
    global.pendingSignups[session.id] = {
      email: normalizedEmail, // ✅ Store normalized email
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

    // ✅ Email is already normalized from createCheckout
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

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail, // ✅ Store normalized email
        name: signupData.name,
        password: signupData.password,
        role: signupData.role,
        storageLimit: signupData.storageLimit,
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription || null,
        subscriptionStatus: 'active',
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

    // ✅ NORMALIZE EMAIL TO LOWERCASE
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail } // ✅ Use normalized email
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
          role: user.role,
          storageUsed: user.storageUsed.toString(),
          storageLimit: user.storageLimit.toString(),
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
        },
      });
    }

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
      case 'ORG_SMALL':
        newPriceId = process.env.STRIPE_SMALL_ORG_PRICE;
        newStorageLimit = 10 * 1024 * 1024 * 1024;
        break;
      case 'ORG_MEDIUM':
        newPriceId = process.env.STRIPE_MEDIUM_ORG_PRICE;
        newStorageLimit = 30 * 1024 * 1024 * 1024;
        break;
      case 'ORG_ENTERPRISE':
        newPriceId = process.env.STRIPE_ENTERPRISE_PRICE;
        newStorageLimit = 100 * 1024 * 1024 * 1024;
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

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

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

module.exports = {
  createCheckout,
  completeSignup,
  signIn,
  getCurrentUser,
  handleUpgradePlan,
  verifyResetToken,
  resetPassword,
};