import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { generateMailTransporter } from "./email.utils";
dotenv.config();

const supportEmail = "mydoshbox@gmail.com";
const appName = "MyDoshbox";

export const sendOrganizationVerificationEmail = async (
  email: string,
  token: string,
  organizationName: string
) => {
  try {
    const transport = generateMailTransporter();

    const verificationURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/organization/verify-email?token=${token}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Organization Email Verification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .org-badge { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏢 Verify Your Organization Email</h1>
        </div>
        <div class="content">
          <div class="org-badge">
            <strong>Organization:</strong> ${organizationName}
          </div>
          <p>Hello,</p>
          <p>Thank you for registering your organization with <strong>${appName}</strong>! We're excited to have ${organizationName} on board.</p>
          <p>To complete your organization registration and ensure the security of your account, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationURL}" class="button">Verify Organization Email</a>
          </div>
          <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationURL}</p>
          <p><strong>Note:</strong> This verification link will expire in 2 hours for security purposes.</p>
          <p>If you didn't create an organization account with ${appName}, please ignore this email.</p>
          <p>If you have any questions or need assistance, feel free to contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Verify Your ${appName} Organization Email Address`,
      html: emailMessage,
    });

    console.log(
      "Organization verification email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error("Error sending organization verification email:", err);
    throw err;
  }
};

export const sendOrganizationWelcomeEmail = async (
  email: string,
  organizationName: string
) => {
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .feature-box { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${appName}! 🎉</h1>
        </div>
        <div class="content">
          <p>Hello ${organizationName},</p>
          <p>Your organization email has been successfully verified! Welcome to the ${appName} business community.</p>
          <p>You now have full access to all our organizational features and services. Here's what you can do next:</p>
          <div class="feature-box">
            <h3>🚀 Get Started</h3>
            <ul>
              <li>Complete your organization profile</li>
              <li>Set up team members and roles</li>
              <li>Configure your organizational settings</li>
              <li>Explore our business features</li>
              <li>Access your organization dashboard</li>
            </ul>
          </div>
          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/organization/login" class="button">Login to Organization Dashboard</a>
          </div>
          <p>If you have any questions or need help getting started, our support team is here to assist you at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
          <p>Thank you for choosing ${appName}. We look forward to helping ${organizationName} grow!</p>
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Welcome to ${appName} - ${organizationName}!`,
      html: emailMessage,
    });

    console.log(
      "Organization welcome email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error("Error sending organization welcome email:", err);
    throw err;
  }
};

export const sendOrganizationPasswordResetEmail = async (
  email: string,
  resetToken: string,
  organizationName: string
) => {
  try {
    const transport = generateMailTransporter();

    const resetURL = `${process.env.DEPLOYED_FRONTEND_BASE_URL}/auth/organization/reset-password?token=${resetToken}`;

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Organization Password Reset Request</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .org-info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Organization Password Reset</h1>
        </div>
        <div class="content">
          <div class="org-info">
            <strong>Organization:</strong> ${organizationName}
          </div>
          <p>Hello,</p>
          <p>We received a request to reset the password for your ${appName} organization account.</p>
          <p>If you made this request, click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetURL}" class="button">Reset Organization Password</a>
          </div>
          <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetURL}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This password reset link will expire in 10 minutes for security purposes.
          </div>
          <p><strong>If you didn't request a password reset:</strong></p>
          <ul>
            <li>Please ignore this email</li>
            <li>Your password will remain unchanged</li>
            <li>Consider reviewing your organization's security settings</li>
            <li>Contact support if you're concerned about unauthorized access</li>
          </ul>
          <p>For security reasons, we never ask for your password via email.</p>
          <p>If you need assistance, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Organization Password Reset Request - ${appName}`,
      html: emailMessage,
    });

    console.log(
      "Organization password reset email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error("Error sending organization password reset email:", err);
    throw err;
  }
};

export const sendOrganizationPasswordResetSuccessEmail = async (
  email: string,
  organizationName: string
) => {
  try {
    const transport = generateMailTransporter();

    const emailMessage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Organization Password Reset Successful</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 10px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .org-info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Successful ✓</h1>
        </div>
        <div class="content">
          <div class="org-info">
            <strong>Organization:</strong> ${organizationName}
          </div>
          <p>Hello,</p>
          <p>Your ${appName} organization account password has been successfully reset.</p>
          <p>You can now login to your organization account using your new password.</p>
          <div style="text-align: center;">
            <a href="${
              process.env.DEPLOYED_FRONTEND_BASE_URL
            }/organization/login" class="button">Login to Organization Dashboard</a>
          </div>
          <div class="info-box">
            <strong>ℹ️ Security Tips for Organizations:</strong>
            <ul style="margin: 10px 0;">
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication if available</li>
              <li>Review team member access regularly</li>
              <li>Keep your contact information up to date</li>
            </ul>
          </div>
          <p><strong>If you didn't make this change:</strong></p>
          <ul>
            <li>Someone may have accessed your organization account</li>
            <li>Contact our support team immediately at <a href="mailto:${supportEmail}">${supportEmail}</a></li>
            <li>We'll help secure your account and investigate</li>
            <li>Review recent account activity</li>
          </ul>
          <p>Thank you for keeping your organization account secure!</p>
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      to: email,
      from: process.env.VERIFICATION_EMAIL,
      subject: `Organization Password Reset Successful - ${appName}`,
      html: emailMessage,
    });

    console.log(
      "Organization password reset success email sent - Message ID:",
      info?.messageId
    );
    return info;
  } catch (err) {
    console.error(
      "Error sending organization password reset success email:",
      err
    );
    throw err;
  }
};
