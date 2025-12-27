const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createCheckoutSession, getCheckoutSession, upgradePlan } = require('../services/stripeService');

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
    const { email, name, password, plan, enterpriseConfig } = req.body;

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
    const session = await createCheckoutSession(normalizedEmail, priceId, plan);

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
        email: normalizedEmail,
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

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
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

    // ✅ CHECK IF 2FA IS ENABLED
    if (user.twoFactorEnabled) {
      // If no 2FA code provided, send one
      if (!twoFactorCode) {
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save code to user (expires in 10 minutes)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorSecret: code,
            resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000)
          }
        });

        // Send email
        await send2FALoginEmail(user.email, user.name, code);

        return res.status(200).json({
          status: 'success',
          message: '2FA code sent to your email',
          requires2FA: true
        });
      }

      // If code provided, verify it
      if (user.twoFactorSecret !== twoFactorCode) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid 2FA code'
        });
      }

      // Check if code expired
      if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
        return res.status(401).json({
          status: 'error',
          message: '2FA code expired. Please sign in again.'
        });
      }

      // Clear 2FA code after successful verification
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorSecret: null,
          resetTokenExpiry: null
        }
      });
    }

    // Continue with normal sign in (after 2FA verification if enabled)
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
    const resetTokenExpiry = new Date(Date.now() + 3600000);

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
  forgotPassword,
  verifyResetToken,
  resetPassword,
};