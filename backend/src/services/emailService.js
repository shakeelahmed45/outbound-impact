const nodemailer = require('nodemailer');

// Create transporter with Hostinger SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_PORT) || 587, // Using 587 instead of 465
    secure: false, // Use TLS instead of SSL
    auth: {
      user: process.env.EMAIL_USER || 'noreply@outboundimpact.org',
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
};

// Test email connection
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server connection successful');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    return false;
  }
};

// Send welcome email to new user
const sendWelcomeEmail = async (userEmail, userName, userRole) => {
  try {
    const transporter = createTransporter();

    const planNames = {
      INDIVIDUAL: 'Individual',
      ORG_SMALL: 'Small Organization',
      ORG_MEDIUM: 'Medium Organization',
      ORG_ENTERPRISE: 'Enterprise'
    };

    const planName = planNames[userRole] || 'Individual';

    const mailOptions = {
      from: `"Outbound Impact" <${process.env.EMAIL_FROM || 'noreply@outboundimpact.org'}>`,
      to: userEmail,
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
              <p style="color: #999; font-size: 12px;">© 2024 Outbound Impact. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', userEmail);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw error;
  }
};

// Send admin notification
const sendAdminNotification = async (userData) => {
  try {
    const transporter = createTransporter();

    const adminEmail = process.env.ADMIN_EMAIL || 'shakeel@outboundimpact.org';

    const planNames = {
      INDIVIDUAL: 'Individual',
      ORG_SMALL: 'Small Organization',
      ORG_MEDIUM: 'Medium Organization',
      ORG_ENTERPRISE: 'Enterprise'
    };

    const planName = planNames[userData.userRole] || userData.userRole;

    const mailOptions = {
      from: `"Outbound Impact System" <${process.env.EMAIL_FROM || 'noreply@outboundimpact.org'}>`,
      to: adminEmail,
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
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent to:', adminEmail);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    throw error;
  }
};

// Test connection when service loads
testConnection();

module.exports = {
  sendWelcomeEmail,
  sendAdminNotification,
  testConnection
};