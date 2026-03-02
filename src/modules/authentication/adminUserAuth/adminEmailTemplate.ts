import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { generateMailTransporter } from "../../../utilities/email.utils";

dotenv.config();
const supportEmail = "bookings@dubaninternationalhotel.com";
const appName = "Duban International Hotel";

export const sendAdminVerificationEmail = async (
  email: string,
  token: string,
) => {
  try {
    const transport = generateMailTransporter();

    const verificationURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/admin/verify-email?token=${token}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Email Verification - Duban International Hotel</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f5f0; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid rgba(245,166,35,0.1); }
        .header { background: linear-gradient(135deg, #0F1D3A 0%, #152A5E 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(to right, #F5A623, #FCC846); }
        .header h1 { margin: 0; font-size: 28px; font-family: 'Playfair Display', serif; letter-spacing: 1px; }
        .badge { display: inline-block; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); color: #0F1D3A; padding: 6px 18px; border-radius: 30px; font-size: 12px; font-weight: bold; margin-top: 15px; letter-spacing: 1px; text-transform: uppercase; }
        .content { padding: 45px 35px; background-color: #ffffff; }
        .logo { text-align: center; margin-bottom: 25px; }
        .logo span { font-size: 24px; font-weight: bold; color: #0F1D3A; font-family: 'Playfair Display', serif; border-bottom: 2px solid #F5A623; padding-bottom: 8px; }
        .gold-icon { width: 80px; height: 80px; margin: 0 auto 25px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #0F1D3A; box-shadow: 0 10px 20px rgba(245,166,35,0.3); }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); color: #0F1D3A; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(245,166,35,0.4); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,166,35,0.5); }
        .info-box { background: linear-gradient(135deg, #f8f5f0 0%, #e8e0d5 100%); border-left: 4px solid #F5A623; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .security-note { background-color: #0F1D3A; border-left: 4px solid #F5A623; padding: 20px; margin: 25px 0; border-radius: 8px; color: #ffffff; }
        .security-note ul { color: rgba(255,255,255,0.8); }
        .footer { background-color: #0F1D3A; color: rgba(255,255,255,0.6); text-align: center; padding: 30px; font-size: 13px; border-top: 4px solid #F5A623; }
        .footer a { color: #F5A623; text-decoration: none; font-weight: bold; }
        .divider { height: 2px; background: linear-gradient(to right, transparent, #F5A623, transparent); margin: 35px 0; }
        .hotel-name { color: #F5A623; font-weight: bold; }
        .signature { border-top: 2px solid #F5A623; padding-top: 25px; margin-top: 25px; text-align: left; }
        .signature strong { color: #0F1D3A; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏨 DUBAN INTERNATIONAL HOTEL</h1>
          <div class="badge">ADMINISTRATOR VERIFICATION</div>
        </div>
        <div class="content">
          <div class="logo">
            <span>DUBAN</span>
          </div>
          <div class="gold-icon">🔐</div>
          <h2 style="color: #0F1D3A; text-align: center; margin-bottom: 20px; font-family: 'Playfair Display', serif;">Secure Your Admin Access</h2>
          <p>Dear Administrator,</p>
          <p>Welcome to the <strong class="hotel-name">Duban International Hotel</strong> administrative portal! Your admin account has been created and requires verification to ensure the highest level of security for our prestigious establishment.</p>
          
          <div class="info-box">
            <strong style="color: #0F1D3A;">⚡ Quick Verification Required</strong>
            <p style="margin: 10px 0 0 0; color: #0F1D3A;">Click the button below to verify your email address and activate your administrative privileges:</p>
          </div>

          <div style="text-align: center;">
            <a href="${verificationURL}" class="button">Verify Admin Account</a>
          </div>

          <p style="text-align: center; font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #F5A623; background-color: #f8f5f0; padding: 15px; border-radius: 8px; font-size: 13px; text-align: center; border: 1px dashed #F5A623;">${verificationURL}</p>

          <div class="security-note">
            <strong style="color: #F5A623;">🔒 Security Information:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>This verification link expires in <strong>2 hours</strong></li>
              <li>Only use this link if you created an admin account</li>
              <li>Never share your admin credentials with anyone</li>
            </ul>
          </div>

          <div class="divider"></div>

          <p><strong style="color: #0F1D3A;">Admin Account Details:</strong></p>
          <ul style="color: #4a5568;">
            <li>✓ Enhanced security features for hotel management</li>
            <li>✓ Full property management system access</li>
            <li>✓ Guest and reservation oversight</li>
            <li>✓ Staff and department controls</li>
            <li>✓ Financial reporting and analytics</li>
          </ul>

          <p>If you did not create this admin account, please contact our security team immediately at <a href="mailto:${supportEmail}" style="color: #F5A623; text-decoration: none; font-weight: bold;">${supportEmail}</a>.</p>

          <div class="signature">
            <p style="margin: 0;">Warm regards,</p>
            <p style="margin: 5px 0 0 0;"><strong>Duban International Hotel</strong><br>Management Team</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Duban International Hotel - Administrator Portal</strong></p>
          <p>61-63 Ogunnusi Road, Ogba, Ikeja, Lagos, Nigeria</p>
          <p>&copy; ${new Date().getFullYear()} Duban International Hotel. All rights reserved.</p>
          <p style="margin-top: 15px;">This is an automated security message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🔐 Verify Your Duban International Hotel Admin Account`,
      html: emailMessage,
    });

    console.log("Admin verification email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending admin verification email:", err);
    throw err;
  }
};

export const sendAdminWelcomeEmail = async (email: string, name: string) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Duban International Hotel Admin Team</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f5f0; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid rgba(245,166,35,0.1); }
        .header { background: linear-gradient(135deg, #0F1D3A 0%, #152A5E 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(to right, #F5A623, #FCC846); }
        .header h1 { margin: 0; font-size: 32px; font-family: 'Playfair Display', serif; }
        .content { padding: 45px 35px; background-color: #ffffff; }
        .logo { text-align: center; margin-bottom: 25px; }
        .logo span { font-size: 24px; font-weight: bold; color: #0F1D3A; font-family: 'Playfair Display', serif; border-bottom: 2px solid #F5A623; padding-bottom: 8px; }
        .welcome-icon { width: 100px; height: 100px; margin: 0 auto 25px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #0F1D3A; box-shadow: 0 10px 20px rgba(245,166,35,0.3); }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); color: #0F1D3A; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(245,166,35,0.4); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,166,35,0.5); }
        .feature-card { background: linear-gradient(135deg, #f8f5f0 0%, #e8e0d5 100%); border-left: 4px solid #F5A623; padding: 25px; margin: 20px 0; border-radius: 8px; }
        .feature-card h3 { color: #0F1D3A; margin-top: 0; font-family: 'Playfair Display', serif; }
        .footer { background-color: #0F1D3A; color: rgba(255,255,255,0.6); text-align: center; padding: 30px; font-size: 13px; border-top: 4px solid #F5A623; }
        .footer a { color: #F5A623; text-decoration: none; }
        .hotel-name { color: #F5A623; font-weight: bold; }
        .signature { border-top: 2px solid #F5A623; padding-top: 25px; margin-top: 25px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WELCOME TO THE TEAM</h1>
        </div>
        <div class="content">
          <div class="logo">
            <span>DUBAN</span>
          </div>
          <div class="welcome-icon">👋</div>
          <h2 style="color: #0F1D3A; text-align: center; font-family: 'Playfair Display', serif;">Welcome, ${name}!</h2>
          <p style="text-align: center; font-size: 18px; color: #0F1D3A; margin-bottom: 30px;">Your admin account has been successfully verified!</p>

          <p>Congratulations on joining the <strong class="hotel-name">Duban International Hotel</strong> administrative team. Your role is essential in maintaining our reputation for excellence and providing unforgettable experiences for our guests.</p>

          <div class="feature-card">
            <h3>🎯 Your Administrative Capabilities:</h3>
            <ul style="color: #0F1D3A;">
              <li><strong>Property Management:</strong> Oversee room inventory, rates, and availability</li>
              <li><strong>Guest Services:</strong> Manage reservations and special requests</li>
              <li><strong>Staff Coordination:</strong> Assign and monitor team responsibilities</li>
              <li><strong>Financial Oversight:</strong> Track revenue, expenses, and reporting</li>
              <li><strong>Event Management:</strong> Coordinate meetings, events, and celebrations</li>
              <li><strong>Quality Assurance:</strong> Monitor guest satisfaction and service standards</li>
            </ul>
          </div>

          <div class="feature-card">
            <h3>🚀 Getting Started Guide:</h3>
            <ol style="color: #0F1D3A;">
              <li>Login to your admin dashboard</li>
              <li>Complete your administrator profile</li>
              <li>Review the property management documentation</li>
              <li>Set up notification preferences for bookings</li>
              <li>Familiarize yourself with the reporting tools</li>
              <li>Connect with your team members</li>
            </ol>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.DEPLOYED_FRONTEND_BASE_URL}/admin/login" class="button">Access Admin Dashboard</a>
          </div>

          <div style="background-color: #0F1D3A; border-left: 4px solid #F5A623; padding: 20px; margin: 25px 0; border-radius: 8px; color: #ffffff;">
            <strong style="color: #F5A623;">⚠️ Important Security Reminders:</strong>
            <ul style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8);">
              <li>Never share your admin credentials</li>
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication if available</li>
              <li>Regularly review system logs and guest feedback</li>
              <li>Report any suspicious activity immediately</li>
            </ul>
          </div>

          <p>For any questions or assistance, our support team is available 24/7 at <a href="mailto:${supportEmail}" style="color: #F5A623; text-decoration: none; font-weight: bold;">${supportEmail}</a> or call <strong style="color: #0F1D3A;">+234 701 415 1460</strong>.</p>

          <div class="signature">
            <p style="margin: 0;">Best regards,</p>
            <p style="margin: 5px 0 0 0;"><strong>The Duban International Hotel</strong><br>Management Team</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Duban International Hotel - Administrator Portal</strong></p>
          <p>61-63 Ogunnusi Road, Ogba, Ikeja, Lagos, Nigeria</p>
          <p>+234 701 415 1460 | bookings@dubaninternationalhotel.com</p>
          <p>&copy; ${new Date().getFullYear()} Duban International Hotel. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🎉 Welcome to Duban International Hotel Admin Team!`,
      html: emailMessage,
    });

    console.log("Admin welcome email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending admin welcome email:", err);
    throw err;
  }
};

export const sendAdminPasswordResetEmail = async (
  email: string,
  resetToken: string,
) => {
  try {
    const transport = generateMailTransporter();

    const resetURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/admin/reset-password?token=${resetToken}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Password Reset - Duban International Hotel</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f5f0; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid rgba(245,166,35,0.1); }
        .header { background: linear-gradient(135deg, #0F1D3A 0%, #152A5E 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(to right, #F5A623, #FCC846); }
        .header h1 { margin: 0; font-size: 28px; font-family: 'Playfair Display', serif; }
        .content { padding: 45px 35px; background-color: #ffffff; }
        .logo { text-align: center; margin-bottom: 25px; }
        .logo span { font-size: 24px; font-weight: bold; color: #0F1D3A; font-family: 'Playfair Display', serif; border-bottom: 2px solid #F5A623; padding-bottom: 8px; }
        .alert-icon { width: 80px; height: 80px; margin: 0 auto 25px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #0F1D3A; box-shadow: 0 10px 20px rgba(245,166,35,0.3); }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); color: #0F1D3A; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(245,166,35,0.4); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,166,35,0.5); }
        .warning-box { background: linear-gradient(135deg, #f8f5f0 0%, #e8e0d5 100%); border-left: 4px solid #F5A623; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .security-alert { background-color: #0F1D3A; border: 2px solid #F5A623; padding: 20px; margin: 25px 0; border-radius: 8px; color: #ffffff; text-align: center; }
        .security-alert strong { color: #F5A623; font-size: 16px; }
        .footer { background-color: #0F1D3A; color: rgba(255,255,255,0.6); text-align: center; padding: 30px; font-size: 13px; border-top: 4px solid #F5A623; }
        .footer a { color: #F5A623; text-decoration: none; }
        .hotel-name { color: #F5A623; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 ADMIN PASSWORD RESET</h1>
        </div>
        <div class="content">
          <div class="logo">
            <span>DUBAN</span>
          </div>
          <div class="alert-icon">⚠️</div>
          <h2 style="color: #0F1D3A; text-align: center; font-family: 'Playfair Display', serif;">Security Alert: Password Reset Requested</h2>
          
          <p>Dear Administrator,</p>
          <p>We received a request to reset the password for your <strong class="hotel-name">Duban International Hotel</strong> admin account. This is a critical security action that requires your immediate attention.</p>

          <div class="warning-box">
            <strong style="color: #0F1D3A;">🛡️ Security Notice:</strong>
            <p style="margin: 10px 0 0 0; color: #0F1D3A;">Admin account password resets are closely monitored for security. If you did not request this reset, please contact our security team immediately.</p>
          </div>

          <p>If you made this request, click the button below to set a new password:</p>

          <div style="text-align: center;">
            <a href="${resetURL}" class="button">Reset Admin Password</a>
          </div>

          <p style="text-align: center; font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #F5A623; background-color: #f8f5f0; padding: 15px; border-radius: 8px; font-size: 13px; text-align: center; border: 1px dashed #F5A623;">${resetURL}</p>

          <div class="security-alert">
            <strong>⏰ EXPIRES IN 10 MINUTES</strong>
            <p style="margin: 10px 0 0 0; font-size: 16px;">This password reset link is time-sensitive for security purposes</p>
          </div>

          <div style="background: linear-gradient(135deg, #f8f5f0 0%, #e8e0d5 100%); padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #F5A623;">
            <strong style="color: #0F1D3A;">🔒 Password Requirements:</strong>
            <ul style="margin: 10px 0 0 0; color: #0F1D3A;">
              <li>Minimum 8 characters (12+ recommended)</li>
              <li>Mix of uppercase and lowercase letters</li>
              <li>Include numbers and special characters</li>
              <li>Avoid common words or patterns</li>
              <li>Do not reuse previous passwords</li>
            </ul>
          </div>

          <p><strong style="color: #F5A623;">If you did NOT request a password reset:</strong></p>
          <ul style="color: #4a5568;">
            <li>🚫 Do not click the reset link</li>
            <li>📧 Contact security immediately: <a href="mailto:${supportEmail}" style="color: #F5A623; font-weight: bold;">${supportEmail}</a></li>
            <li>📞 Call: <strong>+234 701 415 1460</strong></li>
            <li>🔍 Your account may have been compromised</li>
            <li>🛡️ We will help secure your admin account</li>
          </ul>

          <div style="border-top: 2px solid #F5A623; padding-top: 25px; margin-top: 25px;">
            <p style="margin: 0;">Best regards,</p>
            <p style="margin: 5px 0 0 0;"><strong>Duban International Hotel</strong><br>Security Team</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Duban International Hotel - Security Alert</strong></p>
          <p>61-63 Ogunnusi Road, Ogba, Ikeja, Lagos, Nigeria</p>
          <p>+234 701 415 1460 | security@dubaninternationalhotel.com</p>
          <p>&copy; ${new Date().getFullYear()} Duban International Hotel. All rights reserved.</p>
          <p style="color: #F5A623; font-weight: bold; margin-top: 15px;">This is a critical security notification.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🔐 SECURITY ALERT: Duban International Hotel Admin Password Reset`,
      html: emailMessage,
    });

    console.log(
      "Admin password reset email sent - Message ID:",
      info?.messageId,
    );
    return info;
  } catch (err) {
    console.error("Error sending admin password reset email:", err);
    throw err;
  }
};

export const sendAdminPasswordResetSuccessEmail = async (email: string) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - Duban International Hotel</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f5f0; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid rgba(245,166,35,0.1); }
        .header { background: linear-gradient(135deg, #0F1D3A 0%, #152A5E 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(to right, #F5A623, #FCC846); }
        .header h1 { margin: 0; font-size: 28px; font-family: 'Playfair Display', serif; }
        .content { padding: 45px 35px; background-color: #ffffff; }
        .logo { text-align: center; margin-bottom: 25px; }
        .logo span { font-size: 24px; font-weight: bold; color: #0F1D3A; font-family: 'Playfair Display', serif; border-bottom: 2px solid #F5A623; padding-bottom: 8px; }
        .success-icon { width: 80px; height: 80px; margin: 0 auto 25px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #0F1D3A; box-shadow: 0 10px 20px rgba(245,166,35,0.3); }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #F5A623 0%, #FCC846 100%); color: #0F1D3A; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(245,166,35,0.4); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,166,35,0.5); }
        .success-box { background: linear-gradient(135deg, #f8f5f0 0%, #e8e0d5 100%); border-left: 4px solid #F5A623; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .security-tip { background-color: #0F1D3A; border-left: 4px solid #F5A623; padding: 20px; margin: 25px 0; border-radius: 8px; color: #ffffff; }
        .footer { background-color: #0F1D3A; color: rgba(255,255,255,0.6); text-align: center; padding: 30px; font-size: 13px; border-top: 4px solid #F5A623; }
        .footer a { color: #F5A623; text-decoration: none; }
        .hotel-name { color: #F5A623; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ PASSWORD RESET SUCCESSFUL</h1>
        </div>
        <div class="content">
          <div class="logo">
            <span>DUBAN</span>
          </div>
          <div class="success-icon">🎉</div>
          <h2 style="color: #0F1D3A; text-align: center; font-family: 'Playfair Display', serif;">Password Successfully Changed</h2>
          
          <p>Dear Administrator,</p>
          <p>Your <strong class="hotel-name">Duban International Hotel</strong> admin account password has been successfully reset and updated in our secure system.</p>

          <div class="success-box">
            <strong style="color: #0F1D3A;">✓ Confirmed Actions:</strong>
            <ul style="margin: 10px 0 0 0; color: #0F1D3A;">
              <li>Password successfully changed</li>
              <li>All active sessions terminated</li>
              <li>Security logs updated</li>
              <li>Account access restored</li>
            </ul>
          </div>

          <p>You can now login to your admin dashboard using your new password:</p>

          <div style="text-align: center;">
            <a href="${process.env.DEPLOYED_FRONTEND_BASE_URL}/admin/login" class="button">Login to Admin Dashboard</a>
          </div>

          <div class="security-tip">
            <strong style="color: #F5A623;">🔐 Security Best Practices:</strong>
            <ul style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8);">
              <li>Store securely using a password manager</li>
              <li>Don't reuse this password on other platforms</li>
              <li>Update your password every 90 days</li>
              <li>Monitor your admin account activity regularly</li>
              <li>Enable two-factor authentication if available</li>
            </ul>
          </div>

          <div style="background-color: #f8f5f0; border: 2px solid #F5A623; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <strong style="color: #F5A623;">⚠️ IMPORTANT - If You Didn't Make This Change:</strong>
            <p style="margin: 10px 0 0 0; color: #0F1D3A;">If you did not reset your password, your admin account may have been compromised. Take immediate action:</p>
            <ul style="margin: 10px 0 0 0; color: #0F1D3A;">
              <li>🚨 Contact our security team IMMEDIATELY</li>
              <li>📧 Email: <a href="mailto:${supportEmail}" style="color: #F5A623; font-weight: bold;">${supportEmail}</a></li>
              <li>📞 Call: <strong>+234 701 415 1460</strong></li>
              <li>🔒 We will secure your account and investigate</li>
              <li>⏰ Response time: Within 15 minutes for admin accounts</li>
            </ul>
          </div>

          <div style="background-color: #f8f5f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0;"><strong style="color: #0F1D3A;">📝 Password Change Details:</strong></p>
            <ul style="margin: 10px 0 0 0; color: #4a5568;">
              <li><strong>Changed At:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Account Type:</strong> Hotel Administrator</li>
              <li><strong>Security Level:</strong> Enhanced</li>
            </ul>
          </div>

          <p>Thank you for maintaining the security of your admin account. Your diligence helps keep the entire Duban International Hotel platform secure.</p>

          <div style="border-top: 2px solid #F5A623; padding-top: 25px; margin-top: 25px;">
            <p style="margin: 0;">Best regards,</p>
            <p style="margin: 5px 0 0 0;"><strong>Duban International Hotel</strong><br>Security Team</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Duban International Hotel - Administrator Portal</strong></p>
          <p>61-63 Ogunnusi Road, Ogba, Ikeja, Lagos, Nigeria</p>
          <p>+234 701 415 1460 | security@dubaninternationalhotel.com</p>
          <p>&copy; ${new Date().getFullYear()} Duban International Hotel. All rights reserved.</p>
          <p>This is an automated security confirmation.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `✅ Duban International Hotel Admin Password Successfully Reset`,
      html: emailMessage,
    });

    console.log(
      "Admin password reset success email sent - Message ID:",
      info?.messageId,
    );
    return info;
  } catch (err) {
    console.error("Error sending admin password reset success email:", err);
    throw err;
  }
};
