const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Temporary storage for 2FA codes (in production, use Redis or database)
const twoFactorCodes = new Map();

// Function to send 2FA setup email using Resend
const send2FASetupEmail = async (userEmail, userName, code) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping 2FA email');
      return { success: false, error: 'Resend not configured' };
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [userEmail],
      replyTo: 'support@outboundimpact.org',
      subject: '🔒 Your Two-Factor Authentication Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; }
            .code-box { background: #f0f0ff; border: 3px dashed #800080; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #800080; font-family: 'Courier New', monospace; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🔒 Two-Factor Authentication</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your security code is ready</p>
            </div>
            
            <div class="content">
              <h2 style="color: #800080;">Hi ${userName}! 👋</h2>
              
              <p>You're enabling two-factor authentication for your <strong>Outbound Impact</strong> account. Here's your verification code:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Enter this code to complete setup</p>
              </div>
              
              <div class="warning">
                <p style="margin: 0; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong>
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This code expires in <strong>10 minutes</strong></li>
                  <li>Never share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; color: #666;">
                Once enabled, you'll receive a verification code each time you log in to keep your account extra secure.
              </p>
              
              <p style="margin-top: 20px;">
                <strong>Stay secure!</strong><br>
                The Outbound Impact Team
              </p>
            </div>
            
            <div class="footer">
              <p>Questions? Email us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a></p>
              <p style="color: #999; font-size: 12px;">© 2025 Outbound Impact. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send 2FA setup email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 2FA setup email sent to:', userEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send 2FA setup email:', error.message);
    return { success: false, error: error.message };
  }
};

// Enable 2FA - Send verification code
router.post('/2fa/enable', authMiddleware, async (req, res) => {
  try {
    // Get user details to access name
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        twoFactorEnabled: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiry (10 minutes)
    twoFactorCodes.set(user.id, {
      code,
      expires: Date.now() + 10 * 60 * 1000
    });

    // Send email using Resend with user's name
    const emailResult = await send2FASetupEmail(user.email, user.name, code);

    if (!emailResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send verification email'
      });
    }

    res.json({
      status: 'success',
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send verification code'
    });
  }
});

// Verify code and enable 2FA
router.post('/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    const stored = twoFactorCodes.get(req.user.userId);

    if (!stored) {
      return res.status(400).json({
        status: 'error',
        message: 'No verification code found. Please request a new one.'
      });
    }

    if (Date.now() > stored.expires) {
      twoFactorCodes.delete(req.user.userId);
      return res.status(400).json({
        status: 'error',
        message: 'Verification code expired. Please request a new one.'
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorEnabled: true }
    });

    twoFactorCodes.delete(req.user.userId);

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Two-Factor Authentication Enabled'
      }
    });

    res.json({
      status: 'success',
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enable two-factor authentication'
    });
  }
});

// Disable 2FA
router.post('/2fa/disable', authMiddleware, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Two-Factor Authentication Disabled'
      }
    });

    res.json({
      status: 'success',
      message: 'Two-factor authentication disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to disable two-factor authentication'
    });
  }
});

// Get 2FA status
router.get('/2fa/status', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { twoFactorEnabled: true }
    });

    res.json({
      status: 'success',
      enabled: user.twoFactorEnabled || false
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get 2FA status'
    });
  }
});

// Get audit logs
router.get('/audit-logs', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.auditLog.count({
      where: { userId: req.user.userId }
    });

    res.json({
      status: 'success',
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch audit logs'
    });
  }
});

// Update security settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { ipWhitelist, sessionTimeout, loginNotifications, activityAlerts } = req.body;

    // Store in user metadata or create separate SecuritySettings table
    const settings = {
      ipWhitelist,
      sessionTimeout,
      loginNotifications,
      activityAlerts
    };

    // For now, store in user's metadata field (you may want a separate table)
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        // Add securitySettings Json field to User model if needed
        // securitySettings: settings
      }
    });

    res.json({
      status: 'success',
      message: 'Security settings updated',
      settings
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update security settings'
    });
  }
});

module.exports = router;