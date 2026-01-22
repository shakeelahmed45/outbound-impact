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
      ORG_ENTERPRISE: 'Enterprise',
      'Individual': 'Individual',
      'Small Org': 'Small Organization',
      'Medium Org': 'Medium Organization',
      'Enterprise': 'Enterprise'
    };

    const planName = planNames[userRole] || userRole || 'Individual';

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
              <h1 style="margin: 0; font-size: 32px; color: white;">Welcome to Outbound Impact!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Your account is ready to go 🚀</p>
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

// 🎨 FIXED: Send admin notification - NOW WITH PURPLE GRADIENT!
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
      ORG_ENTERPRISE: 'Enterprise',
      'Individual': 'Individual',
      'Small Org': 'Small Organization',
      'Medium Org': 'Medium Organization',
      'Enterprise': 'Enterprise'
    };

    const planName = planNames[userData.plan] || planNames[userData.userRole] || userData.plan || userData.userRole || 'Individual';

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
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; margin-top: 0; border-radius: 0 0 10px 10px; }
            .info-row { padding: 12px; margin: 8px 0; background: #f8f9fa; border-left: 3px solid #800080; }
            .label { font-weight: bold; color: #800080; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: white;">🎉 New User Signed Up!</h2>
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
                <span class="label">Amount:</span> ${userData.amount ? '$' + userData.amount : 'N/A'}
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

// ✅ Send payment receipt email after successful payment
const sendPaymentReceiptEmail = async (email, name, amount, currency, plan) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping payment receipt');
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [email],
      replyTo: 'support@outboundimpact.org',
      subject: `✅ Payment Receipt - ${plan} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
            .receipt-box { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #800080; }
            .amount { font-size: 36px; font-weight: bold; color: #800080; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px; color: white;">✅ Payment Received!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Thank you for your payment</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; margin: 0 0 20px;">Hi ${name},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px;">Thank you! We've successfully received your payment.</p>
              
              <div class="receipt-box">
                <h3 style="color: #800080; margin: 0 0 20px;">📋 Payment Details</h3>
                <p style="margin: 10px 0;"><strong>Plan:</strong> ${plan}</p>
                <p style="margin: 10px 0;"><strong>Amount Paid:</strong></p>
                <div class="amount">${currency} $${amount.toFixed(2)}</div>
                <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ Paid</span></p>
                <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0;">Your subscription is active and ready to use. You can manage your subscription anytime from your dashboard.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://outboundimpact.net/dashboard/settings" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Subscription →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                If you have any questions about this payment, feel free to reach out to our support team at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a>
              </p>
              
              <p style="font-size: 16px; margin: 25px 0 0;">
                Best regards,<br>
                <strong>The Outbound Impact Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px;">Questions? Email us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a></p>
              <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Outbound Impact. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send payment receipt:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Payment receipt sent to:', email, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send payment receipt:', error.message);
    return { success: false, error: error.message };
  }
};

// 🎨 FIXED: Send payment failed notification - NOW WITH PURPLE GRADIENT!
const sendPaymentFailedEmail = async (email, name, amount, currency, reason) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping payment failed email');
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [email],
      replyTo: 'support@outboundimpact.org',
      subject: '⚠️ Payment Failed - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
            .warning-box { background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EF4444; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px; color: white;">⚠️ Payment Failed</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">We couldn't process your payment</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; margin: 0 0 20px;">Hi ${name},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px;">We were unable to process your recent payment of <strong>${currency} $${amount.toFixed(2)}</strong>.</p>
              
              <div class="warning-box">
                <h3 style="color: #DC2626; margin: 0 0 15px;">❌ Reason for Failure</h3>
                <p style="margin: 0; font-size: 15px; color: #991B1B;">${reason}</p>
              </div>
              
              <h3 style="color: #800080; margin: 30px 0 15px;">🔄 What happens next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li style="margin: 10px 0;">We'll automatically retry the payment in a few days</li>
                <li style="margin: 10px 0;">Your subscription remains active during this grace period</li>
                <li style="margin: 10px 0;">Please update your payment method to avoid service interruption</li>
              </ul>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://outboundimpact.net/dashboard/settings" class="button">
                  Update Payment Method →
                </a>
              </div>
              
              <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #1E40AF;">
                  <strong>💡 Need Help?</strong> If you're having trouble updating your payment method, our support team is here to help. Contact us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a>
                </p>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0 0;">
                Best regards,<br>
                <strong>The Outbound Impact Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px;">Questions? Email us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a></p>
              <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Outbound Impact. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send payment failed email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Payment failed email sent to:', email, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send payment failed email:', error.message);
    return { success: false, error: error.message };
  }
};

// 🎨 FIXED: Send cancellation confirmation - NOW WITH PURPLE GRADIENT!
const sendCancellationEmail = async (email, name) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping cancellation email');
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [email],
      replyTo: 'support@outboundimpact.org',
      subject: 'Subscription Canceled - We\'ll Miss You',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
            .info-box { background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #800080; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px; color: white;">Subscription Canceled</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">We're sorry to see you go</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; margin: 0 0 20px;">Hi ${name},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px;">Your subscription has been canceled as requested.</p>
              
              <div class="info-box">
                <h3 style="color: #800080; margin: 0 0 15px;">📋 What This Means</h3>
                <ul style="margin: 0; padding-left: 20px; color: #6B7280;">
                  <li style="margin: 10px 0;">You'll have access until the end of your current billing period</li>
                  <li style="margin: 10px 0;">No further charges will be made to your account</li>
                  <li style="margin: 10px 0;">Your data will be retained for 30 days</li>
                  <li style="margin: 10px 0;">You can reactivate anytime before the end of your billing period</li>
                </ul>
              </div>
              
              <h3 style="color: #800080; margin: 30px 0 15px;">💭 We'd Love Your Feedback</h3>
              <p style="font-size: 15px; margin: 0 0 20px; color: #666;">
                We're sorry to see you go! If you have any feedback about why you canceled, we'd really appreciate hearing it. Your input helps us improve Outbound Impact for everyone.
              </p>
              
              <div style="background: #F0F0FF; padding: 20px; border-radius: 8px; border-left: 4px solid #800080; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #5B21B6;">
                  <strong>💡 Changed Your Mind?</strong> You can reactivate your subscription anytime from your dashboard. All your campaigns and content will still be there!
                </p>
              </div>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://outboundimpact.net/dashboard/settings" class="button">
                  Reactivate Subscription →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Thank you for being part of Outbound Impact. We hope to see you again soon!
              </p>
              
              <p style="font-size: 16px; margin: 25px 0 0;">
                Best wishes,<br>
                <strong>The Outbound Impact Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px;">Questions? Email us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a></p>
              <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Outbound Impact. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send cancellation email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Cancellation email sent to:', email, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error.message);
    return { success: false, error: error.message };
  }
};

// ✨ Send team invitation email
const sendTeamInvitationEmail = async (invitationData) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping invitation email');
      return { success: false, error: 'Resend not configured' };
    }

    const { recipientEmail, inviterName, inviterEmail, role, invitationLink, message } = invitationData;

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
                    <td style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); padding: 40px 40px 30px; text-align: center;">
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
                          <td style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                            🎯 Your Role: ${role}
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px; background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #800080;">
                        ${roleDescriptions[role] || 'Team member access'}
                      </p>
                      
                      ${message ? `
                      <!-- ✨ Personal Message from Inviter -->
                      <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe5ff 100%); border: 2px solid #9333EA; border-radius: 12px; padding: 20px; margin: 0 0 30px;">
                        <p style="color: #800080; font-size: 13px; font-weight: bold; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                          💌 Personal Message
                        </p>
                        <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic; white-space: pre-wrap;">
                          "${message}"
                        </p>
                        <p style="color: #999999; font-size: 12px; margin: 12px 0 0; text-align: right;">
                          — ${inviterName}
                        </p>
                      </div>
                      ` : ''}
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${invitationLink}" style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(128, 0, 128, 0.3);">
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
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #800080;">Outbound Impact</strong> - Share Content. Track Analytics. Grow Your Reach.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #cccccc;">
                        © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; color: #cccccc;">
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

// ✨ Send reminder email for pending invitations
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
                    <td style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
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
                            <a href="${invitationLink}" style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
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

// ✨ Send password reset email
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
                    <td style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
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
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(128, 0, 128, 0.3);">
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
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #800080;">Outbound Impact</strong> - Share Content. Track Analytics. Grow Your Reach.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #cccccc;">
                        © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; color: #cccccc;">
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

// ✅ Send refund confirmation with account deletion notice
const sendRefundAccountDeletionEmail = async ({ userEmail, userName, refundAmount, refundId }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping refund email');
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [userEmail],
      subject: '✅ Refund Processed & Account Deleted - Outbound Impact',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .container { 
              background: #ffffff; 
              border-radius: 12px; 
              overflow: hidden; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #800080 0%, #9333EA 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .content { 
              padding: 40px 30px; 
            }
            .refund-box { 
              background: #f0f0ff; 
              border: 2px solid #800080; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 25px 0; 
              text-align: center; 
            }
            .amount { 
              font-size: 36px; 
              font-weight: bold; 
              color: #800080; 
              margin: 10px 0; 
            }
            .warning-box { 
              background: #FEF2F2; 
              border-left: 4px solid #EF4444; 
              padding: 20px; 
              margin: 25px 0; 
              border-radius: 6px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 12px 0; 
              border-bottom: 1px solid #eee; 
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #666; 
              font-size: 14px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: white;">✅ Refund Processed</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${userName},</h2>
              
              <p>Your refund request has been processed successfully, and your account has been permanently deleted as requested.</p>
              
              <div class="refund-box">
                <div style="color: #666; font-size: 14px;">Refund Amount</div>
                <div class="amount">$${refundAmount.toFixed(2)}</div>
                <div style="color: #666; font-size: 14px; margin-top: 5px;">USD</div>
              </div>
              
              <div style="margin: 30px 0;">
                <div class="info-row">
                  <span style="font-weight: 600; color: #666;">Status</span>
                  <span>✅ Processed</span>
                </div>
                <div class="info-row">
                  <span style="font-weight: 600; color: #666;">Refund ID</span>
                  <span>${refundId}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                  <span style="font-weight: 600; color: #666;">Processing Time</span>
                  <span>5-10 business days</span>
                </div>
              </div>
              
              <div class="warning-box">
                <p style="margin: 0; color: #DC2626;"><strong>⚠️ Account Permanently Deleted</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #991B1B;">
                  <li>Your subscription has been canceled</li>
                  <li>Your account has been permanently deleted</li>
                  <li>All your data, campaigns, and media have been permanently removed</li>
                  <li>You will not be able to log in to this account anymore</li>
                  <li>The refund will appear on your original payment method within 5-10 business days</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">We're sorry to see you go! If you have any feedback about your experience, we'd love to hear from you.</p>
              
              <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
                If you'd like to use Outbound Impact again in the future, you're welcome to create a new account anytime at <a href="https://outboundimpact.net" style="color: #800080;">outboundimpact.net</a>
              </p>
              
              <p style="margin-top: 20px;">
                Thank you for trying Outbound Impact!<br>
                <strong>The Outbound Impact Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p>Questions? Email us at <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a></p>
              <p style="font-size: 12px; color: #999; margin-top: 10px;">
                © ${new Date().getFullYear()} Outbound Impact. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send refund email:', error);
      return { success: false, error };
    }

    console.log('✅ Refund confirmation email sent:', data.id);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Refund email error:', error);
    return { success: false, error };
  }
};

// 🎨 FIXED: Send refund notification to admin - NOW WITH PURPLE GRADIENT!
const sendAdminRefundNotification = async ({ userName, userEmail, refundAmount, refundReason, refundId, userRole }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping admin refund notification');
      return { success: false };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'business.shakeelahmed@gmail.com';

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact <noreply@outboundimpact.org>',
      to: [adminEmail],
      subject: `💸 Refund Processed & Account Deleted - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .container { 
              background: #ffffff; 
              border-radius: 12px; 
              overflow: hidden; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #800080 0%, #9333EA 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
            .content { 
              padding: 30px; 
            }
            .info-box { 
              background: #f8f9fa; 
              border-left: 4px solid #800080; 
              padding: 15px; 
              margin: 15px 0; 
              border-radius: 4px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0; 
              border-bottom: 1px solid #dee2e6; 
            }
            .info-row:last-child { 
              border-bottom: none; 
            }
            .label { 
              font-weight: 600; 
              color: #495057; 
            }
            .value { 
              color: #212529; 
            }
            .reason-box { 
              background: #fff3cd; 
              border: 1px solid #ffc107; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 6px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: white;">💸 Refund Processed</h1>
              <p style="margin: 10px 0 0; color: white;">Account Permanently Deleted</p>
            </div>
            
            <div class="content">
              <h2>Refund Details</h2>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="label">User Name</span>
                  <span class="value">${userName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email</span>
                  <span class="value">${userEmail}</span>
                </div>
                <div class="info-row">
                  <span class="label">Plan</span>
                  <span class="value">${userRole}</span>
                </div>
                <div class="info-row">
                  <span class="label">Refund Amount</span>
                  <span class="value">$${refundAmount.toFixed(2)} USD</span>
                </div>
                <div class="info-row">
                  <span class="label">Refund ID</span>
                  <span class="value">${refundId}</span>
                </div>
                <div class="info-row">
                  <span class="label">Processed At</span>
                  <span class="value">${new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
              
              <h3>User's Reason</h3>
              <div class="reason-box">
                <p style="margin: 0; white-space: pre-wrap;">${refundReason}</p>
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 6px;">
                <p style="margin: 0;"><strong>Actions Taken:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Stripe refund processed</li>
                  <li>Subscription canceled</li>
                  <li>User account permanently deleted</li>
                  <li>All user data permanently removed</li>
                  <li>Confirmation email sent to user</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send admin refund notification:', error);
      return { success: false, error };
    }

    console.log('✅ Admin refund notification sent:', data.id);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Admin refund notification error:', error);
    return { success: false, error };
  }
};

// Test connection when service loads
testConnection();

// ═══════════════════════════════════════════════════════════
// 💬 LIVE CHAT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

// Send notification to admin when user sends a chat message
const sendChatNotificationToAdmin = async (userData, message) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping chat notification');
      return { success: false, error: 'Resend not configured' };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'business.shakeelahmed@gmail.com';

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact Live Chat <noreply@outboundimpact.org>',
      to: [adminEmail],
      replyTo: userData.userEmail,
      subject: `💬 New Live Chat Message from ${userData.userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .header { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; margin-top: 0; border-radius: 0 0 10px 10px; }
            .message-box { padding: 20px; margin: 20px 0; background: #fff7f0; border-left: 4px solid #FF6B35; border-radius: 4px; }
            .info-row { padding: 12px; margin: 8px 0; background: #f8f9fa; border-left: 3px solid #FF6B35; }
            .label { font-weight: bold; color: #FF6B35; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: white;">💬 New Live Chat Message!</h2>
            </div>
            
            <div class="content">
              <h3>User Information:</h3>
              
              <div class="info-row">
                <span class="label">Name:</span> ${userData.userName}
              </div>
              
              <div class="info-row">
                <span class="label">Email:</span> ${userData.userEmail}
              </div>
              
              <div class="info-row">
                <span class="label">Timestamp:</span> ${new Date().toLocaleString()}
              </div>
              
              <h3 style="margin-top: 30px;">Message:</h3>
              <div class="message-box">
                <p style="margin: 0; font-size: 16px; white-space: pre-wrap;">${message}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'https://www.outboundimpact.org'}/admin-panel/live-chat" class="button">
                  Reply in Admin Panel
                </a>
              </div>
              
              <p style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc; font-size: 14px;">
                <strong>💡 Quick Tip:</strong> Click the button above to reply instantly, or reply to this email to contact the user directly at ${userData.userEmail}
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send chat notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Chat notification sent to admin:', adminEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send chat notification:', error.message);
    return { success: false, error: error.message };
  }
};

// Send notification to user when admin replies
const sendChatReplyToUser = async (userEmail, userName, adminReply) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend not configured - skipping user notification');
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Outbound Impact Support <support@outboundimpact.org>',
      to: [userEmail],
      replyTo: process.env.ADMIN_EMAIL || 'business.shakeelahmed@gmail.com',
      subject: `💬 New Reply from Outbound Impact Support`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .header { background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; margin-top: 0; border-radius: 0 0 10px 10px; }
            .message-box { padding: 20px; margin: 20px 0; background: #f8f0ff; border-left: 4px solid #800080; border-radius: 4px; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #800080 0%, #9333EA 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: white;">💬 Support Team Replied!</h2>
            </div>
            
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Our support team has replied to your message:</p>
              
              <div class="message-box">
                <p style="margin: 0; font-size: 16px; white-space: pre-wrap;">${adminReply}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'https://www.outboundimpact.org'}/live-chat" class="button">
                  Continue Conversation
                </a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                You can also reply to this email directly to continue the conversation.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send user notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Reply notification sent to user:', userEmail, '(ID:', data.id, ')');
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send user notification:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendAdminNotification,
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendCancellationEmail,
  sendTeamInvitationEmail,
  sendInvitationReminderEmail,
  sendPasswordResetEmail,
  sendRefundAccountDeletionEmail,
  sendAdminRefundNotification,
  sendChatNotificationToAdmin,
  sendChatReplyToUser,
  testConnection
};