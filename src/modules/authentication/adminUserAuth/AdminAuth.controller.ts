import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import AdminUser from "./adminAuth.model";
import {
  sendAdminVerificationEmail,
  sendAdminWelcomeEmail,
  sendAdminPasswordResetEmail,
  sendAdminPasswordResetSuccessEmail,
} from "../adminUserAuth/adminEmailTemplate";
import bcrypt from "bcrypt";
import { createSessionAndSendTokens } from "../../../utilities/createSessionAndSendToken.util";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import crypto from "crypto";
import { getCookieOptions } from "../../../utilities/cookieConfig.util";

export const adminUserRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phone_number, password, confirm_password, name, username } =
      req.body;

    if (!email || !password || !confirm_password || !name) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message:
          "All fields (email, name, password, confirm_password) are required",
      };
      return next(error);
    }

    if (password !== confirm_password) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Passwords do not match",
      };
      return next(error);
    }

    const adminEmailAlreadyExist = await AdminUser.findOne({ email });

    if (adminEmailAlreadyExist) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Admin user already exists, please proceed to login",
      };
      return next(error);
    }

    const newAdmin = new AdminUser({
      email,
      phone_number,
      password,
      name,
      username: username || email.split("@")[0],
      role: "admin",
      isSuperAdmin: false,
    });

    await newAdmin.save();

    const verificationToken = jwt.sign(
      { email: newAdmin.email, role: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" }
    );

    await sendAdminVerificationEmail(email, verificationToken);

    res.status(201).json({
      status: "success",
      message:
        "Admin account created successfully! Verification email sent. Please verify your account to continue. Note that token expires in 2 hours",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error registering the admin user",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const adminUserLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email and password are required",
      };
      return next(error);
    }

    const admin = await AdminUser.findOne({ email }).select("+password");
    if (!admin) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Admin user not found",
      };
      return next(error);
    }

    if (!admin.email_verified) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Please verify your email before logging in",
      };
      return next(error);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Invalid email or password",
      };
      return next(error);
    }

    const userAgent = req.get("User-Agent") || "unknown";

    const result = await createSessionAndSendTokens({
      user: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        phone_number: admin.phone_number,
      },
      userAgent: userAgent,
      role: "admin",
      message: "Admin login successful",
    });

    // ✅ FIX: Use consistent cookie configuration
    res.cookie(
      "access_token",
      result.accessToken,
      getCookieOptions(15 * 60 * 1000) // 15 minutes
    );

    res.cookie(
      "refresh_token",
      result.refreshToken,
      getCookieOptions(30 * 24 * 60 * 60 * 1000) // 30 days (changed from 7 for consistency)
    );

    res.status(200).json({
      status: "success",
      message: result.message,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        username: admin.username,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin,
        permissions: admin.permissions,
      },
      token: result.accessToken, // ✅ ADD: For Redux compatibility
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error logging in admin",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const verifyAdminEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid or missing token",
      };
      return next(error);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      email: string;
      role: string;
    };

    if (decoded.role !== "admin") {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Invalid token for admin verification",
      };
      return next(error);
    }

    const admin = await AdminUser.findOne({ email: decoded.email });

    if (!admin) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Admin user not found",
      };
      return next(error);
    }

    if (admin.email_verified) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email already verified",
      };
      return next(error);
    }

    admin.email_verified = true;
    await admin.save();

    await sendAdminWelcomeEmail(admin.email, admin.name);

    res.status(200).json({
      status: "success",
      message:
        "Admin email verified successfully! You can now login to your account",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: error instanceof jwt.JsonWebTokenError ? 400 : 500,
      status: "fail",
      message:
        error instanceof jwt.JsonWebTokenError
          ? "Invalid or expired token"
          : "Error verifying email",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const resendAdminVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email is required",
      };
      return next(error);
    }

    const admin = await AdminUser.findOne({ email });

    if (!admin) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Admin user not found",
      };
      return next(error);
    }

    if (admin.email_verified) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email is already verified",
      };
      return next(error);
    }

    const verificationToken = jwt.sign(
      { email: admin.email, role: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" }
    );

    await sendAdminVerificationEmail(email, verificationToken);

    res.status(200).json({
      status: "success",
      message:
        "Verification email resent successfully. Please check your inbox",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error resending verification email",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const forgotAdminPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email is required",
      };
      return next(error);
    }

    const admin = await AdminUser.findOne({ email });

    if (!admin) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Admin user with this email does not exist",
      };
      return next(error);
    }

    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });

    await sendAdminPasswordResetEmail(email, resetToken);

    res.status(200).json({
      status: "success",
      message:
        "Password reset link sent to your email. Link expires in 10 minutes",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error processing forgot password request",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const resetAdminPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;
    const { password, confirm_password } = req.body;

    if (!token || typeof token !== "string") {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid or missing token",
      };
      return next(error);
    }

    if (!password || !confirm_password) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Password and confirm password are required",
      };
      return next(error);
    }

    if (password !== confirm_password) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Passwords do not match",
      };
      return next(error);
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await AdminUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!admin) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid or expired reset token",
      };
      return next(error);
    }

    admin.password = password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.passwordChangedAt = new Date();

    await admin.save();

    await sendAdminPasswordResetSuccessEmail(admin.email);

    res.status(200).json({
      status: "success",
      message:
        "Password reset successfully! You can now login with your new password",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error resetting password",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
