import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const generateMailTransporter = () => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transport;
};

const supportEmail = process.env.SUPPORT_EMAIL || "support@qrgenius.com";
const appName = "QRGenius";

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const transport = generateMailTransporter();

    const verificationURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/verify-email?token=${token}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f0f9ff;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(3, 105, 161, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #0369A1 0%, #06B6D4 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .logo {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #0369A1 0%, #06B6D4 100%);
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(3, 105, 161, 0.3);
        }
        .button:hover {
          opacity: 0.9;
        }
        .info-box {
          background-color: #f0f9ff;
          border-left: 4px solid #06B6D4;
          padding: 16px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 14px;
        }
        .link-text {
          word-break: break-all;
          color: #0369A1;
          background-color: #f0f9ff;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📱</div>
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p><strong>Hello there!</strong></p>
          <p>Thank you for joining <strong>${appName}</strong>! We're excited to have you on board and help you create amazing QR codes for your business.</p>
          <p>To get started and unlock all features, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationURL}" class="button">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p class="link-text">${verificationURL}</p>
          <div class="info-box">
            <strong>⏱️ Important:</strong> This verification link will expire in 2 hours for security purposes.
          </div>
          <p>If you didn't create a ${appName} account, please ignore this email and no account will be created.</p>
          <p>Need help? Contact our support team at <a href="mailto:${supportEmail}" style="color: #0369A1;">${supportEmail}</a></p>
          <p style="margin-top: 32px;"><strong>Best regards,</strong><br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">Create. Scan. Connect.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Welcome to ${appName} - Verify Your Email`,
      html: emailMessage,
    });

    console.log("Verification email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending verification email:", err);
    throw err;
  }
};

export const sendWelcomeEmail = async (email: string) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${appName}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f0f9ff;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #22C55E 0%, #86EFAC 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .logo {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #0369A1 0%, #06B6D4 100%);
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(3, 105, 161, 0.3);
        }
        .feature-box {
          background-color: #f0f9ff;
          padding: 20px;
          border-radius: 12px;
          margin: 24px 0;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          margin: 12px 0;
        }
        .feature-icon {
          color: #06B6D4;
          margin-right: 12px;
          font-size: 20px;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎉</div>
          <h1>Welcome to ${appName}!</h1>
        </div>
        <div class="content">
          <p><strong>Congratulations!</strong></p>
          <p>Your email has been successfully verified! You're now part of the ${appName} community, where creating dynamic, trackable QR codes is just a click away.</p>
          
          <div class="feature-box">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #0369A1;">Here's what you can do with ${appName}:</p>
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <span>Create custom QR codes for menus, pricing, and events</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔐</span>
              <span>Generate secure QR/barcode invitations for event access</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>Track and analyze QR code scans with detailed analytics</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎨</span>
              <span>Customize QR codes with your brand colors and logo</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/auth?view=login" class="button">Get Started Now</a>
          </div>

          <p>Need help getting started? Our support team is ready to assist you at <a href="mailto:${supportEmail}" style="color: #0369A1;">${supportEmail}</a></p>
          
          <p style="margin-top: 32px;"><strong>Welcome aboard!</strong><br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">Create. Scan. Connect.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Welcome to ${appName}! 🎉`,
      html: emailMessage,
    });

    console.log("Welcome email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending welcome email:", err);
    throw err;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  try {
    const transport = generateMailTransporter();

    const resetURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/reset-password?token=${resetToken}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #fef2f2;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .logo {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
        }
        .warning { 
          background-color: #fff3cd; 
          border-left: 4px solid #F59E0B; 
          padding: 16px; 
          margin: 24px 0;
          border-radius: 8px;
        }
        .info-box {
          background-color: #f0f9ff;
          padding: 20px;
          border-radius: 12px;
          margin: 24px 0;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 14px;
        }
        .link-text {
          word-break: break-all;
          color: #DC2626;
          background-color: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔐</div>
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p><strong>Hello,</strong></p>
          <p>We received a request to reset the password for your ${appName} account.</p>
          <p>If you made this request, click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetURL}" class="button">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p class="link-text">${resetURL}</p>
          <div class="warning">
            <strong>⏱️ Important:</strong> This password reset link will expire in 1 hour for security purposes.
          </div>
          <div class="info-box">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0369A1;">If you didn't request a password reset:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Please ignore this email</li>
              <li>Your password will remain unchanged</li>
              <li>Consider changing your password if you're concerned about security</li>
            </ul>
          </div>
          <p><strong>Security reminder:</strong> We will never ask for your password via email.</p>
          <p>If you need assistance, contact us at <a href="mailto:${supportEmail}" style="color: #0369A1;">${supportEmail}</a></p>
          <p style="margin-top: 32px;"><strong>Best regards,</strong><br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">Create. Scan. Connect.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Password Reset Request - ${appName}`,
      html: emailMessage,
    });

    console.log("Password reset email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending password reset email:", err);
    throw err;
  }
};

export const sendPasswordResetSuccessEmail = async (email: string) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f0fdf4;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #22C55E 0%, #86EFAC 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .logo {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
        }
        .button { 
          display: inline-block; 
          padding: 16px 40px; 
          background: linear-gradient(135deg, #0369A1 0%, #06B6D4 100%);
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(3, 105, 161, 0.3);
        }
        .info-box { 
          background-color: #e0f2fe; 
          border-left: 4px solid #06B6D4; 
          padding: 16px; 
          margin: 24px 0;
          border-radius: 8px;
        }
        .warning-box {
          background-color: #fef2f2;
          border-left: 4px solid #DC2626;
          padding: 16px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✅</div>
          <h1>Password Reset Successful</h1>
        </div>
        <div class="content">
          <p><strong>Great news!</strong></p>
          <p>Your ${appName} account password has been successfully reset.</p>
          <p>You can now sign in to your account using your new password:</p>
          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/auth?view=login" class="button">Sign In Now</a>
          </div>
          <div class="info-box">
            <strong>🔒 Security Tip:</strong> Make sure to use a strong, unique password that you don't use for other accounts. Consider using a password manager to keep track of your passwords securely.
          </div>
          <div class="warning-box">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #DC2626;">⚠️ If you didn't make this change:</p>
            <ul style="margin: 8px 0; padding-left: 20px; color: #334155;">
              <li>Someone may have accessed your account</li>
              <li>Contact our support team immediately at <a href="mailto:${supportEmail}" style="color: #DC2626;">${supportEmail}</a></li>
              <li>We'll help secure your account right away</li>
            </ul>
          </div>
          <p>Thank you for keeping your ${appName} account secure!</p>
          <p style="margin-top: 32px;"><strong>Best regards,</strong><br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">Create. Scan. Connect.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Password Reset Successful - ${appName}`,
      html: emailMessage,
    });

    console.log(
      "Password reset success email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error("Error sending password reset success email:", err);
    throw err;
  }
};

export const sendOtpEmail = async (otp: string, email: string) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OTP Verification</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f0f9ff;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(3, 105, 161, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #0369A1 0%, #06B6D4 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .logo {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #334155;
        }
        .otp-box { 
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 3px dashed #06B6D4; 
          padding: 30px 20px; 
          text-align: center; 
          font-size: 36px; 
          font-weight: bold; 
          letter-spacing: 8px; 
          margin: 24px 0; 
          border-radius: 12px;
          color: #0369A1;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #F59E0B;
          padding: 16px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔐</div>
          <h1>OTP Verification</h1>
        </div>
        <div class="content">
          <p><strong>Hello,</strong></p>
          <p>We received a request to verify your identity. Use the OTP code below to proceed with your password reset:</p>
          <div class="otp-box">${otp}</div>
          <div class="warning">
            <strong>⏱️ Important:</strong> This OTP is valid for only 10 minutes. Please use it promptly.
          </div>
          <p><strong>Security tips:</strong></p>
          <ul style="color: #334155; padding-left: 20px;">
            <li>Never share this OTP with anyone</li>
            <li>Our team will never ask for your OTP</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
          <p>If you need assistance, contact us at <a href="mailto:${supportEmail}" style="color: #0369A1;">${supportEmail}</a></p>
          <p style="margin-top: 32px;"><strong>Best regards,</strong><br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">Create. Scan. Connect.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Your ${appName} Verification Code`,
      html: emailMessage,
    });

    console.log("OTP email sent - Message ID:", info?.messageId);
    return info;
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw err;
  }
};
