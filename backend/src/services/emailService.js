const { Resend } = require('resend');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Test Resend connection
const testConnection = async () => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      return false;
    }
    console.log('✅ Resend API key configured');
    console.log('✅ Email service ready (using Resend)');
    return true;
  } catch (error) {
    console.error('❌ Resend initialization failed:', error.message);
    return false;
  }
};

// Send welcome email to new user
const sendWelcomeEmail = async (userEmail, userName, userRole) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping welcome email');
      return { success: false, error: 'Resend not configured' };
    }

    const planNames = {
      INDIVIDUAL: 'Individual',
      ORG_SMALL: 'Small Organization',
      ORG_MEDIUM: 'Medium Organization',
      ORG_ENTERPRISE: 'Enterprise'
    };

    const planName = planNames[userRole] || 'Individual';

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [userEmail],
      replyTo: 'support@outboundimpact.org',
      subject: '🎉 Welcome to Outbound Impact!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .feature { padding: 15px; margin: 10px 0; background: #f8f9fa; border-left: 4px solid #800080; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Welcome to Outbound Impact!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Your account is ready to go 🚀</p>
            </div>
            
            <div class="content">
              <h2 style="color: #800080;">Hi ${userName}! 👋</h2>
              
              <p>Thank you for joining <strong>Outbound Impact</strong>! We're excited to help you share your content through QR codes and NFC tags.</p>
              
              <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your Plan:</strong> ${planName}</p>
              </div>
              
              <h3 style="color: #800080;">✨ What You Can Do Now:</h3>
              
              <div class="feature">
                <strong>📤 Upload Media</strong><br>
                Upload images, videos, audio files, and text content
              </div>
              
              <div class="feature">
                <strong>📱 Generate QR Codes</strong><br>
                Create beautiful purple QR codes for your content
              </div>
              
              <div class="feature">
                <strong>🔗 Write NFC Tags</strong><br>
                Turn your content into tap-to-view NFC experiences
              </div>
              
              <div class="feature">
                <strong>📊 Track Analytics</strong><br>
                See who's viewing your content and from where
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://outboundimpact.net/dashboard" class="button">
                  Go to Dashboard →
                </a>
              </div>
              
              <p style="margin-top: 30px;">Need help getting started? Our support team is here for you!</p>
              
              <p style="margin-top: 20px;">
                <strong>Happy sharing!</strong><br>
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
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Welcome email sent to:', userEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send admin notification
const sendAdminNotification = async (userData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping admin notification');
      return { success: false, error: 'Resend not configured' };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'business.shakeelahmed@gmail.com';

    const planNames = {
      INDIVIDUAL: 'Individual',
      ORG_SMALL: 'Small Organization',
      ORG_MEDIUM: 'Medium Organization',
      ORG_ENTERPRISE: 'Enterprise'
    };

    const planName = planNames[userData.userRole] || userData.userRole;

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact System <noreply@outboundimpact.org>',
      to: [adminEmail],
      subject: `🔔 New User Signup - ${planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .header { background: #800080; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; margin-top: 0; }
            .info-row { padding: 12px; margin: 8px 0; background: #f8f9fa; border-left: 3px solid #800080; }
            .label { font-weight: bold; color: #800080; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🎉 New User Signed Up!</h2>
            </div>
            
            <div class="content">
              <h3>User Details:</h3>
              
              <div class="info-row">
                <span class="label">Name:</span> ${userData.userName}
              </div>
              
              <div class="info-row">
                <span class="label">Email:</span> ${userData.userEmail}
              </div>
              
              <div class="info-row">
                <span class="label">Plan:</span> ${planName}
              </div>
              
              <div class="info-row">
                <span class="label">Subscription ID:</span> ${userData.subscriptionId || 'N/A'}
              </div>
              
              <div class="info-row">
                <span class="label">Timestamp:</span> ${new Date().toLocaleString()}
              </div>
              
              <p style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc;">
                <strong>Action Required:</strong> Welcome the new user and ensure they have a great onboarding experience!
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send admin notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Admin notification sent to:', adminEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error.message);
    return { success: false, error: error.message };
  }
};

// ✨ NEW: Send team invitation email
const sendTeamInvitationEmail = async (invitationData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping invitation email');
      return { success: false, error: 'Resend not configured' };
    }

    const { recipientEmail, inviterName, inviterEmail, role, invitationLink } = invitationData;

    const roleDescriptions = {
      VIEWER: '👁️ <strong>Viewer Access:</strong> You can view all content, campaigns, and analytics.',
      EDITOR: '✏️ <strong>Editor Access:</strong> You can view and edit content, create campaigns, and manage media.',
      ADMIN: '👑 <strong>Admin Access:</strong> You have full access to all features including team management, settings, and billing.'
    };

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [recipientEmail],
      replyTo: inviterEmail,
      subject: `🎉 You've been invited to join ${inviterName}'s team on Outbound Impact`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header with Purple Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">You're Invited! 🎉</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Join the Outbound Impact team</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi there! 👋
                      </p>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        <strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their team on <strong>Outbound Impact</strong>.
                      </p>
                      
                      <!-- Role Badge -->
                      <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                            🎯 Your Role: ${role}
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px; background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #800080;">
                        ${roleDescriptions[role] || 'Team member access'}
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${invitationLink}" style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(128, 0, 128, 0.3);">
                              Accept Invitation →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                        Or copy and paste this link into your browser:<br>
                        <a href="${invitationLink}" style="color: #800080; word-break: break-all;">${invitationLink}</a>
                      </p>
                      
                      <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 20px 0 0;">
                        This invitation link will expire in <strong>7 days</strong>.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 13px; margin: 0 0 10px;">
                        <strong style="color: #800080;">Outbound Impact</strong> - Share Content. Track Analytics. Grow Your Reach.
                      </p>
                      <p style="color: #cccccc; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
                      </p>
                      <p style="color: #cccccc; font-size: 11px; margin: 10px 0 0;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send invitation email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Team invitation email sent to:', recipientEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error.message);
    return { success: false, error: error.message };
  }
};

// ✨ NEW: Send reminder email for pending invitations
const sendInvitationReminderEmail = async (reminderData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping reminder email');
      return { success: false, error: 'Resend not configured' };
    }

    const { recipientEmail, inviterName, role, invitationLink, daysLeft } = reminderData;

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [recipientEmail],
      subject: '⏰ Reminder: Your team invitation is expiring soon',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ Invitation Expiring Soon</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi there! 👋
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Just a friendly reminder that <strong>${inviterName}</strong> has invited you to join their team on Outbound Impact.
                      </p>
                      <p style="color: #ff6b6b; font-size: 16px; line-height: 1.6; margin: 0 0 30px; font-weight: bold;">
                        ⚠️ This invitation will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${invitationLink}" style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                              Accept Invitation Now →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send reminder email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Reminder email sent to:', recipientEmail);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send reminder email:', error.message);
    return { success: false, error: error.message };
  }
};

// ✨ NEW: Send password reset email
const sendPasswordResetEmail = async (resetData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping password reset email');
      return { success: false, error: 'Resend not configured' };
    }

    const { recipientEmail, recipientName, resetLink } = resetData;

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [recipientEmail],
      replyTo: 'support@outboundimpact.org',
      subject: '🔒 Reset Your Password - Outbound Impact',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔒 Password Reset</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Reset your Outbound Impact password</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi ${recipientName}! 👋
                      </p>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        We received a request to reset your password for your <strong>Outbound Impact</strong> account. Click the button below to reset it.
                      </p>
                      
                      <!-- Security notice -->
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
                          <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                        </p>
                      </div>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(128, 0, 128, 0.3);">
                              Reset Password →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                        Or copy and paste this link into your browser:<br>
                        <a href="${resetLink}" style="color: #800080; word-break: break-all;">${resetLink}</a>
                      </p>
                      
                      <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 20px 0 0;">
                        <strong>⏰ This link will expire in 1 hour</strong> for security reasons.
                      </p>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                        Need help? Contact us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 13px; margin: 0 0 10px;">
                        <strong style="color: #800080;">Outbound Impact</strong> - Share Content. Track Analytics. Grow Your Reach.
                      </p>
                      <p style="color: #cccccc; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
                      </p>
                      <p style="color: #cccccc; font-size: 11px; margin: 10px 0 0;">
                        You received this email because a password reset was requested for your account.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Password reset email sent to:', recipientEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

// Test connection when service loads
testConnection();

module.exports = {
  sendWelcomeEmail,
  sendAdminNotification,
  sendTeamInvitationEmail,
  sendInvitationReminderEmail,
  sendPasswordResetEmail,        // ✨ NEW
  testConnection
};