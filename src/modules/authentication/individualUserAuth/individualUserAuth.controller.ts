import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import IndividualUser from "./individualUserAuth.model1";
import individualAuthPasswordToken from "./individualAuthPasswordToken";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} from "../../../utilities/email.utils";
import bcrypt from "bcrypt";
import { signJwt } from "../../../utilities/signAndVerifyToken.util";
import { OAuth2Client } from "google-auth-library";
import { createSessionAndSendTokens } from "../../../utilities/createSessionAndSendToken.util";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import crypto from "crypto";
import { getCookieOptions } from "../../../utilities/cookieConfig.util";

export const individualUserRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phone_number, password, confirm_password } = req.body;

    if (!email || !phone_number || !password || !confirm_password) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message:
          "All fields (email, phone_number, password, confirm_password) are required",
      };
      return next(error);
    }

    if (password !== confirm_password) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Password do not match",
      };
      return next(error);
    }

    const individualEmailAlreadyExist = await IndividualUser.findOne({ email });

    const newUser = new IndividualUser({
      email,
      phone_number,
      password,
      role: "ind",
    });

    await newUser.save();

    const verificationToken = jwt.sign(
      { email: newUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" }
    );

    // Create verification URL and send email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Fix: Check your email utility function signature
    // Option 1: If it expects email and token separately
    await sendVerificationEmail(email, verificationToken);

    // Option 2: If it expects email and URL
    // await sendVerificationEmail(email, verificationUrl);

    // Option 3: If it expects an object
    // await sendVerificationEmail({ email, token: verificationToken });

    res.status(201).json({
      status: "success",
      message:
        "Account created successfully! Verification email sent. Please verify your account to continue. Note that token expires in 2 hours",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error registering the user",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// export const individualUserLogin = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       const error: ErrorResponse = {
//         statusCode: 400,
//         status: "fail",
//         message: "Email and password are required",
//       };
//       return next(error);
//     }

//     const user = await IndividualUser.findOne({ email }).select("+password");
//     if (!user) {
//       const error: ErrorResponse = {
//         statusCode: 404,
//         status: "fail",
//         message: "User not found",
//       };
//       return next(error);
//     }

//     if (!user.email_verified) {
//       const error: ErrorResponse = {
//         statusCode: 403,
//         status: "fail",
//         message: "Please verify your email before logging in",
//       };
//       return next(error);
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       const error: ErrorResponse = {
//         statusCode: 401,
//         status: "fail",
//         message: "Invalid email or password",
//       };
//       return next(error);
//     }

//     // Get user agent from request
//     const userAgent = req.get("User-Agent") || "unknown";

//     // Use the session utility to create session and send tokens
//     const result = await createSessionAndSendTokens({
//       user: user.toObject(),
//       userAgent: userAgent,
//       role: "ind", // Individual user role
//       message: "Login successful",
//     });

//     // Set cookies for access and refresh tokens
//     res.cookie("access_token", result.accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000, // 15 minutes
//     });

//     res.cookie("refresh_token", result.refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     res.status(200).json({
//       status: "success",
//       message: result.message,
//       user: {
//         id: user._id,
//         email: user.email,
//         phone_number: user.phone_number,
//         role: user.role,
//       },
//       accessToken: result.accessToken,
//       refreshToken: result.refreshToken,
//     });
//   } catch (error) {
//     const errResponse: ErrorResponse = {
//       statusCode: 500,
//       status: "error",
//       message: "Error logging in",
//       stack: error instanceof Error ? { stack: error.stack } : undefined,
//     };
//     next(errResponse);
//   }
// };

// export const individualUserLogin = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { email, password } = req.body;

//     // Validation
//     if (!email || !password) {
//       const error: ErrorResponse = {
//         statusCode: 400,
//         status: "fail",
//         message: "Email and password are required",
//       };
//       return next(error);
//     }

//     // Find user and include password field
//     const user = await IndividualUser.findOne({ email }).select("+password");

//     if (!user) {
//       const error: ErrorResponse = {
//         statusCode: 404,
//         status: "fail",
//         message: "Invalid email or password", // Generic message for security
//       };
//       return next(error);
//     }

//     // Check if email is verified
//     if (!user.email_verified) {
//       const error: ErrorResponse = {
//         statusCode: 403,
//         status: "fail",
//         message: "Please verify your email before logging in",
//       };
//       return next(error);
//     }

//     // Verify password
//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       const error: ErrorResponse = {
//         statusCode: 401,
//         status: "fail",
//         message: "Invalid email or password",
//       };
//       return next(error);
//     }

//     // Get user agent from request headers
//     const userAgent = req.get("User-Agent") || "unknown";

//     // Create session and generate tokens
//     const result = await createSessionAndSendTokens({
//       user: {
//         _id: user._id,
//         email: user.email,
//         phone_number: user.phone_number,
//         role: user.role,
//       },
//       userAgent,
//       role: "ind",
//       message: "Login successful",
//     });

//     // Set HTTP-only cookies
//     res.cookie("access_token", result.accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000, // 15 minutes
//     });

//     res.cookie("refresh_token", result.refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//     });

//     // Send response
//     res.status(200).json({
//       status: "success",
//       message: result.message,
//       user: {
//         id: user._id,
//         email: user.email,
//         phone_number: user.phone_number,
//         role: user.role,
//       },
//       accessToken: result.accessToken,
//       refreshToken: result.refreshToken,
//     });
//   } catch (error) {
//     const errResponse: ErrorResponse = {
//       statusCode: 500,
//       status: "error",
//       message: "Error logging in",
//       stack: error instanceof Error ? { stack: error.stack } : undefined,
//     };
//     next(errResponse);
//   }
// };
export const individualUserLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("🔐 Login attempt started:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
      userAgent: req.get("User-Agent"),
      origin: req.get("origin"),
      NODE_ENV: process.env.NODE_ENV,
    });

    const { email, password } = req.body;

    if (!email || !password) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email and password are required",
      };
      return next(error);
    }

    const user = await IndividualUser.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ User not found:", email);
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Invalid email or password",
      };
      return next(error);
    }

    if (!user.email_verified) {
      console.log("⚠️ Email not verified:", email);
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Please verify your email before logging in",
      };
      return next(error);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Invalid email or password",
      };
      return next(error);
    }

    const userAgent = req.get("User-Agent") || "unknown";

    console.log("🎫 Creating session for user:", user._id);

    const result = await createSessionAndSendTokens({
      user: {
        _id: user._id,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role || "ind",
      },
      userAgent,
      role: user.role || "ind",
      message: "Login successful",
    });

    console.log("✅ Session created:", {
      userId: user._id,
      hasAccessToken: !!result.accessToken,
      hasRefreshToken: !!result.refreshToken,
    });

    // Set cookies with logging
    const accessCookieOptions = getCookieOptions(15 * 60 * 1000);
    const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

    console.log("🍪 Setting cookies:", {
      access: accessCookieOptions,
      refresh: refreshCookieOptions,
    });

    res.cookie("access_token", result.accessToken, accessCookieOptions);
    res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);

    console.log("✅ Login successful for:", email);

    res.status(200).json({
      status: "success",
      message: result.message,
      user: {
        id: user._id,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      },
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error("❌ Login error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body.email,
    });

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error logging in",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const verifyEmail = async (
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
    };
    const user = await IndividualUser.findOne({ email: decoded.email });

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    if (user.email_verified) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email already verified",
      };
      return next(error);
    }

    user.email_verified = true;
    await user.save();

    // Send welcome email after successful verification
    await sendWelcomeEmail(user.email);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully! You can now login to your account",
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

export const resendVerificationEmail = async (
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

    const user = await IndividualUser.findOne({ email });

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    if (user.email_verified) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email is already verified",
      };
      return next(error);
    }

    const verificationToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" }
    );

    await sendVerificationEmail(email, verificationToken);

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

// FIXED forgotPassword function
export const forgotPassword = async (
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

    const user = await IndividualUser.findOne({ email });

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User with this email does not exist",
      };
      return next(error);
    }

    // This returns the UNHASHED token to send via email
    const resetToken = user.createPasswordResetToken();

    // Save the user with the hashed token and expiry
    await user.save({ validateBeforeSave: false });

    // Send reset email with the UNHASHED token
    await sendPasswordResetEmail(email, resetToken);

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

// FIXED resetIndividualPassword function
export const resetIndividualPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;
    const { password, confirm_password } = req.body;

    // Validation Checks
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

    // Hash the incoming token the same way it was stored
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching hashed token and unexpired date
    const user = await IndividualUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid or expired reset token",
      };
      return next(error);
    }

    // Update password and clear token fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();

    await user.save();

    // Send success email
    await sendPasswordResetSuccessEmail(user.email);

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
