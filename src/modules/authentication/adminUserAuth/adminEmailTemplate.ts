import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { generateMailTransporter } from "../../../utilities/email.utils";

dotenv.config();
const supportEmail = "mydoshbox@gmail.com";
const appName = "MyDoshbox";
export const sendAdminVerificationEmail = async (
  email: string,
  token: string
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
      <title>Admin Email Verification</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%23ffffff" fill-opacity="0.1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom; background-size: cover; }
        .header h1 { margin: 0; font-size: 28px; position: relative; z-index: 1; }
        .badge { display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; letter-spacing: 1px; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .shield-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.3s ease; }
        .button:hover { transform: translateY(-2px); }
        .info-box { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .security-note { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .footer { background-color: #2d3748; color: #a0aec0; text-align: center; padding: 25px; font-size: 13px; }
        .footer a { color: #667eea; text-decoration: none; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #667eea, transparent); margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Admin Account Verification</h1>
          <span class="badge">ADMINISTRATOR ACCESS</span>
        </div>
        <div class="content">
          <div class="shield-icon">🔐</div>
          <h2 style="color: #667eea; text-align: center; margin-bottom: 20px;">Secure Your Admin Access</h2>
          <p>Hello Administrator,</p>
          <p>Welcome to the <strong>${appName}</strong> administrative platform! Your admin account has been created and requires verification to ensure the highest level of security.</p>
          
          <div class="info-box">
            <strong>⚡ Quick Verification Required</strong>
            <p style="margin: 10px 0 0 0;">Click the button below to verify your email address and activate your administrative privileges:</p>
          </div>

          <div style="text-align: center;">
            <a href="${verificationURL}" class="button">Verify Admin Account</a>
          </div>

          <p style="text-align: center; font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea; background-color: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 13px; text-align: center;">${verificationURL}</p>

          <div class="security-note">
            <strong>🔒 Security Information:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>This verification link expires in <strong>2 hours</strong></li>
              <li>Only use this link if you created an admin account</li>
              <li>Never share your admin credentials with anyone</li>
            </ul>
          </div>

          <div class="divider"></div>

          <p><strong>Admin Account Details:</strong></p>
          <ul>
            <li>✓ Enhanced security features</li>
            <li>✓ Full platform management access</li>
            <li>✓ User and organization oversight</li>
            <li>✓ System configuration controls</li>
          </ul>

          <p>If you did not create this admin account, please contact our security team immediately at <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none; font-weight: bold;">${supportEmail}</a>.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>The ${appName} Security Team</strong></p>
        </div>
        <div class="footer">
          <p><strong>${appName} Administrator Portal</strong></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>This is an automated security message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🔐 Verify Your ${appName} Admin Account - Action Required`,
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
      <title>Welcome Admin</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header h1 { margin: 0; font-size: 32px; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .welcome-icon { font-size: 60px; text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
        .feature-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #10b981; padding: 20px; margin: 15px 0; border-radius: 8px; }
        .feature-card h3 { color: #059669; margin-top: 0; }
        .footer { background-color: #2d3748; color: #a0aec0; text-align: center; padding: 25px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Admin Panel!</h1>
        </div>
        <div class="content">
          <div class="welcome-icon">👋</div>
          <h2 style="color: #10b981; text-align: center;">Hello ${name}!</h2>
          <p style="text-align: center; font-size: 18px; color: #666;">Your admin account has been successfully verified!</p>

          <p>Congratulations! You now have full administrative access to the <strong>${appName}</strong> platform. Your role is crucial in maintaining and managing our system effectively.</p>

          <div class="feature-card">
            <h3>🎯 Your Admin Capabilities:</h3>
            <ul>
              <li><strong>User Management:</strong> Create, modify, and manage user accounts</li>
              <li><strong>Organization Oversight:</strong> Monitor and control organization activities</li>
              <li><strong>System Configuration:</strong> Access to platform settings and configurations</li>
              <li><strong>Analytics & Reports:</strong> View comprehensive system analytics</li>
              <li><strong>Security Controls:</strong> Manage security policies and permissions</li>
            </ul>
          </div>

          <div class="feature-card">
            <h3>🚀 Getting Started:</h3>
            <ol>
              <li>Login to your admin dashboard</li>
              <li>Complete your admin profile</li>
              <li>Review the admin documentation</li>
              <li>Set up your notification preferences</li>
              <li>Familiarize yourself with the control panel</li>
            </ol>
          </div>

          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/admin/login" class="button">Access Admin Dashboard</a>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 8px;">
            <strong>⚠️ Important Security Reminders:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li>Never share your admin credentials</li>
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication if available</li>
              <li>Regularly review system logs and activities</li>
            </ul>
          </div>

          <p>If you have any questions or need assistance with your admin account, our support team is available 24/7 at <a href="mailto:${supportEmail}" style="color: #10b981; text-decoration: none; font-weight: bold;">${supportEmail}</a>.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>The ${appName} Team</strong></p>
        </div>
        <div class="footer">
          <p><strong>${appName} Administrator Portal</strong></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🎉 Welcome to ${appName} Admin Panel!`,
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
  resetToken: string
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
      <title>Admin Password Reset</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .alert-icon { font-size: 60px; text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
        .warning-box { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .security-alert { background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; }
        .footer { background-color: #2d3748; color: #a0aec0; text-align: center; padding: 25px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Admin Password Reset Request</h1>
        </div>
        <div class="content">
          <div class="alert-icon">⚠️</div>
          <h2 style="color: #ef4444; text-align: center;">Security Alert: Password Reset Requested</h2>
          
          <p>Hello Administrator,</p>
          <p>We received a request to reset the password for your <strong>${appName}</strong> admin account. This is a critical security action.</p>

          <div class="warning-box">
            <strong>🛡️ Security Notice:</strong>
            <p style="margin: 10px 0 0 0;">Admin account password resets are closely monitored for security. If you did not request this reset, please contact our security team immediately.</p>
          </div>

          <p>If you made this request, click the button below to set a new password for your admin account:</p>

          <div style="text-align: center;">
            <a href="${resetURL}" class="button">Reset Admin Password</a>
          </div>

          <p style="text-align: center; font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #ef4444; background-color: #fef2f2; padding: 15px; border-radius: 8px; font-size: 13px; text-align: center; border: 1px dashed #ef4444;">${resetURL}</p>

          <div class="security-alert">
            <strong>⏰ TIME SENSITIVE</strong>
            <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>This password reset link expires in 10 minutes</strong></p>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <strong>🔒 Password Requirements:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li>Minimum 8 characters (12+ recommended)</li>
              <li>Mix of uppercase and lowercase letters</li>
              <li>Include numbers and special characters</li>
              <li>Avoid common words or patterns</li>
            </ul>
          </div>

          <p><strong style="color: #ef4444;">If you did NOT request a password reset:</strong></p>
          <ul>
            <li>🚫 Do not click the reset link</li>
            <li>📧 Contact security immediately: <a href="mailto:${supportEmail}" style="color: #ef4444; font-weight: bold;">${supportEmail}</a></li>
            <li>🔍 Your account may have been compromised</li>
            <li>🛡️ We will help secure your admin account</li>
          </ul>

          <p style="margin-top: 30px;">Best regards,<br><strong>The ${appName} Security Team</strong></p>
        </div>
        <div class="footer">
          <p><strong>${appName} Administrator Portal - Security Alert</strong></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="color: #ef4444; font-weight: bold;">This is a critical security notification.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `🔐 SECURITY ALERT: ${appName} Admin Password Reset Request`,
      html: emailMessage,
    });

    console.log(
      "Admin password reset email sent - Message ID:",
      info?.messageId
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
      <title>Admin Password Reset Successful</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .success-icon { font-size: 60px; text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
        .success-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .security-tip { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .footer { background-color: #2d3748; color: #a0aec0; text-align: center; padding: 25px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Admin Password Reset Successful</h1>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>
          <h2 style="color: #10b981; text-align: center;">Password Successfully Changed</h2>
          
          <p>Hello Administrator,</p>
          <p>Your <strong>${appName}</strong> admin account password has been successfully reset and updated in our secure system.</p>

          <div class="success-box">
            <strong>✓ Confirmed Actions:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li>Password successfully changed</li>
              <li>All active sessions terminated</li>
              <li>Security logs updated</li>
              <li>Account access restored</li>
            </ul>
          </div>

          <p>You can now login to your admin dashboard using your new password:</p>

          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/admin/login" class="button">Login to Admin Dashboard</a>
          </div>

          <div class="security-tip">
            <strong>🔐 Security Best Practices:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li><strong>Store Securely:</strong> Use a password manager for your admin credentials</li>
              <li><strong>Unique Password:</strong> Don't reuse this password on other platforms</li>
              <li><strong>Regular Updates:</strong> Consider changing your password every 90 days</li>
              <li><strong>Monitor Activity:</strong> Regularly check your admin account activity logs</li>
            </ul>
          </div>

          <div class="alert-box">
            <strong>⚠️ IMPORTANT - If You Didn't Make This Change:</strong>
            <p style="margin: 10px 0 0 0;">If you did not reset your password, your admin account may have been compromised. Take immediate action:</p>
            <ul style="margin: 10px 0 0 0;">
              <li>🚨 Contact our security team IMMEDIATELY</li>
              <li>📧 Email: <a href="mailto:${supportEmail}" style="color: #ef4444; font-weight: bold;">${supportEmail}</a></li>
              <li>🔒 We will secure your account and investigate</li>
              <li>⏰ Response time: Within 15 minutes for admin accounts</li>
            </ul>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0;"><strong>📝 Password Change Details:</strong></p>
            <ul style="margin: 10px 0 0 0;">
              <li><strong>Changed At:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Account Type:</strong> Administrator</li>
              <li><strong>Security Level:</strong> Enhanced</li>
            </ul>
          </div>

          <p>Thank you for maintaining the security of your admin account. Your diligence helps keep the entire ${appName} platform secure.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>The ${appName} Security Team</strong></p>
        </div>
        <div class="footer">
          <p><strong>${appName} Administrator Portal</strong></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>This is an automated security confirmation.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `✅ ${appName} Admin Password Successfully Reset`,
      html: emailMessage,
    });

    console.log(
      "Admin password reset success email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error("Error sending admin password reset success email:", err);
    throw err;
  }
};
