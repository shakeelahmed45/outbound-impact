const nodemailer = require('nodemailer');

/**
 * Hostinger Email Service
 * Official SMTP Settings: https://support.hostinger.com/en/articles/1575756
 * 
 * Primary: Port 465 with SSL
 * Alternative: Port 587 with TLS/STARTTLS (if port 465 has issues)
 */

// Create transporter using official Hostinger SMTP settings
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465, // SSL port (official Hostinger setting)
  secure: true, // true for SSL on port 465
  auth: {
    user: process.env.HOSTINGER_EMAIL, // Full email: noreply@outboundimpact.org
    pass: process.env.HOSTINGER_PASSWORD // Email password from Hostinger hPanel
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Hostinger SMTP connection failed:', error.message);
  } else {
    console.log('✅ Hostinger SMTP server is ready to send emails');
  }
});

// Email templates
const getPlanDetails = (role) => {
  const plans = {
    'INDIVIDUAL': {
      name: 'Individual Plan',
      price: '$60.00',
      billing: 'One-time payment',
      storage: '2GB',
      features: [
        'Upload images, videos, audio',
        'QR code generation',
        'View tracking & analytics',
        'Unlimited views'
      ]
    },
    'ORG_SMALL': {
      name: 'Small Organization',
      price: '$15.00',
      billing: 'per month',
      storage: '10GB',
      features: [
        'Everything in Individual',
        'Team management (up to 5 users)',
        'Campaign creation',
        'Advanced analytics',
        'Priority support'
      ]
    },
    'ORG_MEDIUM': {
      name: 'Medium Organization',
      price: '$35.00',
      billing: 'per month',
      storage: '30GB',
      features: [
        'Everything in Small Org',
        'Team management (up to 20 users)',
        'Custom branding',
        'Export reports (CSV/PDF)',
        'Dedicated support'
      ]
    },
    'ORG_ENTERPRISE': {
      name: 'Enterprise Plan',
      price: 'Custom',
      billing: 'per month',
      storage: 'Custom',
      features: [
        'Everything in Medium Org',
        'Custom storage capacity',
        'Flexible team size',
        'White-label solution',
        'Full API access',
        'Custom integrations',
        '24/7 dedicated support'
      ]
    }
  };

  return plans[role] || plans['INDIVIDUAL'];
};

// User confirmation email HTML
const getUserConfirmationEmailHTML = (name, email, role, sessionId) => {
  const plan = getPlanDetails(role);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Outbound Impact</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Welcome to Outbound Impact!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your account is ready 🎉</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #800080; margin: 0 0 20px 0;">Hi ${name}! 👋</h2>
              <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for joining Outbound Impact! Your account has been successfully created and your payment has been confirmed.
              </p>

              <!-- Order Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #800080; margin: 0 0 15px 0; font-size: 18px;">📋 Order Summary</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; border-bottom: 1px solid #e0e0e0;"><strong>Plan:</strong></td>
                        <td style="color: #333333; text-align: right; border-bottom: 1px solid #e0e0e0;">${plan.name}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; border-bottom: 1px solid #e0e0e0;"><strong>Price:</strong></td>
                        <td style="color: #333333; text-align: right; border-bottom: 1px solid #e0e0e0;">${plan.price} ${plan.billing}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; border-bottom: 1px solid #e0e0e0;"><strong>Storage:</strong></td>
                        <td style="color: #333333; text-align: right; border-bottom: 1px solid #e0e0e0;">${plan.storage}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;"><strong>Order Date:</strong></td>
                        <td style="color: #333333; text-align: right;">${date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Plan Features -->
              <div style="background-color: #f0f0f0; border-left: 4px solid #800080; padding: 15px; margin: 20px 0;">
                <h4 style="color: #800080; margin: 0 0 10px 0;">✨ Your Plan Includes:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${plan.features.map(feature => `<li style="margin: 5px 0;">${feature}</li>`).join('')}
                </ul>
              </div>

              <!-- Login Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <h3 style="color: #ffffff; margin: 0 0 10px 0;">🔐 Your Login Details</h3>
                    <p style="color: #ffffff; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="color: #ffffff; margin: 15px 0 20px 0; font-size: 14px;">Use the password you created during signup</p>
                    <a href="https://outboundimpact.net/signin" style="display: inline-block; background-color: #ffffff; color: #800080; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
                  </td>
                </tr>
              </table>

              <!-- Getting Started -->
              <h3 style="color: #800080; margin: 30px 0 15px 0;">🚀 Getting Started</h3>
              <ol style="color: #333333; line-height: 1.8; padding-left: 20px;">
                <li><strong>Login</strong> to your account using the button above</li>
                <li><strong>Upload</strong> your first media file (image, video, or audio)</li>
                <li><strong>Generate</strong> QR codes for your content</li>
                <li><strong>Share</strong> and track views with our analytics</li>
              </ol>

              <!-- Support -->
              <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #800080; margin: 0 0 10px 0;">💬 Need Help?</h4>
                <p style="color: #333333; margin: 0; line-height: 1.6;">
                  Our support team is here to help! Contact us at 
                  <a href="mailto:support@outboundimpact.org" style="color: #800080;">support@outboundimpact.org</a>
                </p>
              </div>

              <p style="color: #333333; line-height: 1.6; margin: 20px 0 0 0;">
                Thank you for choosing Outbound Impact. We're excited to help you share your content with the world!
              </p>

              <p style="color: #333333; margin: 20px 0 0 0;">
                Best regards,<br>
                <strong style="color: #800080;">The Outbound Impact Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Outbound Impact. All rights reserved.<br>
                <a href="https://outboundimpact.net" style="color: #800080; text-decoration: none;">outboundimpact.net</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Admin notification email HTML
const getAdminNotificationEmailHTML = (name, email, role, sessionId) => {
  const plan = getPlanDetails(role);
  const date = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Signup Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #800080 0%, #EE82EE 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 New Signup Alert!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #800080; margin: 0 0 20px 0;">New Customer Details</h2>

              <!-- Customer Info -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="color: #666666; font-weight: bold; width: 150px;">Name:</td>
                  <td style="color: #333333;">${name}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Email:</td>
                  <td style="color: #333333; border-top: 1px solid #e0e0e0;">${email}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Plan:</td>
                  <td style="color: #800080; font-weight: bold; border-top: 1px solid #e0e0e0;">${plan.name}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Price:</td>
                  <td style="color: #333333; border-top: 1px solid #e0e0e0;">${plan.price} ${plan.billing}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Storage:</td>
                  <td style="color: #333333; border-top: 1px solid #e0e0e0;">${plan.storage}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Session ID:</td>
                  <td style="color: #999999; font-size: 12px; border-top: 1px solid #e0e0e0;">${sessionId}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-weight: bold; border-top: 1px solid #e0e0e0;">Signup Date:</td>
                  <td style="color: #333333; border-top: 1px solid #e0e0e0;">${date}</td>
                </tr>
              </table>

              <!-- Plan Features -->
              <div style="background-color: #f0f0f0; border-left: 4px solid #800080; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #800080; margin: 0 0 10px 0;">Plan Features:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px;">
                  ${plan.features.map(feature => `<li style="margin: 5px 0;">${feature}</li>`).join('')}
                </ul>
              </div>

              <p style="color: #999999; margin: 20px 0 0 0; font-size: 12px; text-align: center;">
                This is an automated notification from Outbound Impact.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Outbound Impact Admin Dashboard
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Send user confirmation email
const sendUserConfirmationEmail = async (name, email, role, sessionId) => {
  try {
    const htmlContent = getUserConfirmationEmailHTML(name, email, role, sessionId);
    
    const mailOptions = {
      from: `"Outbound Impact" <${process.env.HOSTINGER_EMAIL}>`,
      to: email,
      subject: 'Welcome to Outbound Impact! 🎉',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ User confirmation email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send user confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send admin notification email
const sendAdminNotificationEmail = async (name, email, role, sessionId) => {
  try {
    const plan = getPlanDetails(role);
    const htmlContent = getAdminNotificationEmailHTML(name, email, role, sessionId);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@outboundimpact.org';
    
    const mailOptions = {
      from: `"Outbound Impact Notifications" <${process.env.HOSTINGER_EMAIL}>`,
      to: adminEmail,
      subject: `🎉 New Signup: ${name} - ${plan.name}`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send both emails
const sendSignupEmails = async (name, email, role, sessionId) => {
  try {
    console.log(`📧 Sending signup emails for ${email}...`);
    
    // Send both emails in parallel
    const [userResult, adminResult] = await Promise.all([
      sendUserConfirmationEmail(name, email, role, sessionId),
      sendAdminNotificationEmail(name, email, role, sessionId)
    ]);

    return {
      success: true,
      userEmail: userResult,
      adminEmail: adminResult
    };
  } catch (error) {
    console.error('❌ Failed to send signup emails:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSignupEmails,
  sendUserConfirmationEmail,
  sendAdminNotificationEmail
};