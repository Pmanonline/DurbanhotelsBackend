import jwt from "jsonwebtoken";
import axios from "axios";
import { TwitterApi } from "twitter-api-v2";
import { Request, Response, NextFunction } from "express";
import IndividualUser from "../individualUserAuth/individualUserAuth.model1";
import TwitterSession from "../../sessions/TwitterSession.model";
import {
  sendWelcomeEmail,
  sendVerificationEmail,
} from "../../../utilities/email.utils";
import { createSessionAndSendTokens } from "../../../utilities/createSessionAndSendToken.util";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import { emailValidator } from "../../../utilities/validator.utils";
import { getCookieOptions } from "../../../utilities/cookieConfig.util";

// Define extended types for Twitter response with email
interface TwitterUserWithEmail {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  email?: string;
}

// ==================== GOOGLE LOGIN ====================
export const handleGoogleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("🔐 Google login attempt started:", {
      hasCredential: !!req.body.credential,
      userAgent: req.get("User-Agent"),
      origin: req.get("origin"),
    });

    const { credential } = req.body;

    if (!credential) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Google credential is required",
      };
      return next(error);
    }

    // Decode the JWT credential from Google
    const decoded: any = jwt.decode(credential);
    console.log("📋 Decoded Google token:", {
      email: decoded?.email,
      sub: decoded?.sub,
      email_verified: decoded?.email_verified,
    });

    if (!decoded?.email) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid Google token",
      };
      return next(error);
    }

    // Check if user exists
    let user = await IndividualUser.findOne({ email: decoded.email });
    const isNewUser = !user;

    console.log(
      isNewUser ? "📝 Creating new user" : "✅ User found:",
      decoded.email,
    );

    // Create new user if doesn't exist
    if (!user) {
      user = await IndividualUser.create({
        email: decoded.email,
        phone_number: "", // Optional field
        role: "g-ind", // Google individual user
        picture: decoded.picture,
        sub: decoded.sub, // Google's unique user ID
        email_verified: true, // Google verifies emails
      });
      console.log("✅ Created new user via Google login:", {
        id: user._id,
        email: user.email,
      });
    } else {
      // Update existing user with latest Google data
      user.picture = decoded.picture || user.picture;
      user.sub = decoded.sub || user.sub;
      user.email_verified = true;
      await user.save();
      console.log("✅ Updated existing user:", user._id);
    }

    // Send welcome email for new users
    if (isNewUser) {
      await sendWelcomeEmail(user.email).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });
    }

    // Get user agent
    const userAgent = req.get("User-Agent") || "unknown";

    console.log("🎫 Creating session for user:", user._id);

    // Create session and generate tokens
    const result = await createSessionAndSendTokens({
      user: user.toObject(),
      userAgent: userAgent,
      role: "g-ind",
      message: isNewUser ? "Account created successfully" : "Login successful",
    });

    console.log("✅ Session created successfully");

    // Set cookies with proper options
    const accessCookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

    res.cookie("access_token", result.accessToken, accessCookieOptions);
    res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);

    // 🔥 FIXED: Consistent user response structure
    const responseUser = {
      id: user._id.toString(),
      _id: user._id.toString(), // Add this for consistency
      email: user.email,
      phone_number: user.phone_number || "",
      role: user.role,
      picture: user.picture,
      email_verified: user.email_verified,
      name: user.name,
      username: user.username,
      profile_picture: user.picture, // Add alias for consistency
    };

    console.log("✅ Google login successful:", {
      userId: responseUser.id,
      email: responseUser.email,
    });

    res.status(200).json({
      status: "success",
      message: result.message,
      user: responseUser,
      token: result.accessToken, // Add for consistency
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error("❌ Google login error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Google login failed",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// ==================== TWITTER AUTH INITIATION ====================
export const initiateTwitterAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Use the exact redirect URI from environment variables
    const redirectUri = process.env.TWITTER_REDIRECT_URI;

    if (!redirectUri) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Redirect URI is not configured in environment variables",
      };
      return next(error);
    }

    console.log("🔗 Using Redirect URI:", redirectUri);

    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Generate OAuth link with proper scopes
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
      redirectUri,
      {
        scope: ["users.read", "tweet.read", "offline.access"],
      },
    );

    console.log("✅ Generated Twitter OAuth URL");
    console.log("📍 Redirect URI:", redirectUri);
    console.log("🎯 State:", state);

    // Store session
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await TwitterSession.create({
      state,
      codeVerifier,
      codeChallenge: "library-generated",
      redirectUri,
      expiresAt,
    });

    res.status(200).json({
      status: "success",
      message: "Twitter authentication URL generated",
      data: {
        authUrl: url,
        state: state,
      },
    });
  } catch (error) {
    console.error("❌ Twitter auth initiation error:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Failed to initiate Twitter authentication",
    };
    next(errResponse);
  }
};

// ==================== TWITTER CALLBACK ====================
export const handleTwitterCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Code and state parameters are required",
      };
      return next(error);
    }

    // Find and validate session
    const session = await TwitterSession.findOne({
      state,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid or expired authentication session",
      };
      return next(error);
    }

    const { codeVerifier, redirectUri } = session;

    // Clean up session immediately
    await TwitterSession.deleteOne({ _id: session._id });

    // Initialize Twitter client
    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Exchange code for access token
    const { accessToken } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri,
    });

    console.log("✅ Twitter token exchange successful");

    // Get user data from Twitter - WITHOUT email field
    const authenticatedClient = new TwitterApi(accessToken);
    const userResult = await authenticatedClient.v2.me({
      "user.fields": [
        "id",
        "name",
        "username",
        "profile_image_url",
        "verified",
      ],
    });

    if (!userResult.data) {
      const error: ErrorResponse = {
        statusCode: 500,
        status: "error",
        message: "Failed to fetch user data from Twitter",
      };
      return next(error);
    }

    const { id, name, username, profile_image_url } = userResult.data;

    // Twitter OAuth 2.0 doesn't provide email in API v2
    // Use generated email for now
    const email = `${username}@twitter.generated`;
    const hasRealEmail = false;

    console.log("📧 Using generated email:", email);
    console.log(
      "💡 Twitter OAuth 2.0 doesn't provide email addresses in API v2",
    );

    // Find or create user
    let user = await IndividualUser.findOne({
      $or: [{ email: email }, { sub: id }],
    });

    const isNewUser = !user;

    // Create user data object
    const userData = {
      email: email,
      phone_number: "",
      role: "g-ind" as const,
      picture: profile_image_url,
      sub: id,
      email_verified: hasRealEmail,
      name: name,
      username: username,
    };

    if (!user) {
      user = await IndividualUser.create(userData);
      console.log("✅ Created new user via Twitter login:", user.email);
    } else {
      user.picture = profile_image_url || user.picture;
      user.name = name || user.name;
      user.username = username || user.username;
      await user.save();
    }

    // Get user agent
    const userAgent = req.get("User-Agent") || "unknown";

    // Create session and generate tokens
    const result = await createSessionAndSendTokens({
      user: user.toObject(),
      userAgent: userAgent,
      role: "g-ind",
      message: isNewUser ? "Account created successfully" : "Login successful",
    });

    // Set cookies
    const accessCookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

    res.cookie("access_token", result.accessToken, accessCookieOptions);
    res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);

    // 🔥 FIXED: Consistent user response structure
    const responseUser = {
      id: user._id.toString(),
      _id: user._id.toString(), // Add this for consistency
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      picture: user.picture,
      email_verified: user.email_verified,
      name: user.name,
      username: user.username,
      profile_picture: user.picture, // Add alias
      isTwitterUser: true,
      needsEmail: true,
    };

    res.status(200).json({
      status: "success",
      message: result.message,
      user: responseUser,
      token: result.accessToken, // Add for consistency
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      flags: {
        isTwitterUser: true,
        needsEmail: true,
      },
    });
  } catch (error) {
    // Clean up session on error
    if (req.body.state) {
      await TwitterSession.deleteMany({ state: req.body.state }).catch(
        console.error,
      );
    }

    console.error("💥 Twitter callback error:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Twitter authentication failed",
    };
    next(errResponse);
  }
};

// ==================== FACEBOOK LOGIN ====================
export const handleFacebookLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken } = req.body;

    console.log("🔐 Facebook login attempt started");

    if (!accessToken) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Facebook access token is required",
      };
      return next(error);
    }

    console.log("🔧 Verifying Facebook access token...");

    // Verify token and get user data from Facebook
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/me?fields=id,name,email,picture.width(500).height(500)&access_token=${accessToken}`,
    );

    console.log("✅ Facebook API response received:", {
      id: data.id,
      email: data.email,
      name: data.name,
    });

    if (!data.id) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid Facebook access token",
      };
      return next(error);
    }

    if (!data.email) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message:
          "Email permission required. Please grant email access when logging in with Facebook.",
      };
      return next(error);
    }

    // Find or create user
    let user = await IndividualUser.findOne({
      $or: [{ email: data.email }, { sub: data.id }],
    });

    const isNewUser = !user;

    console.log(
      isNewUser ? "📝 Creating new user" : "✅ User found:",
      data.email,
    );

    if (!user) {
      user = await IndividualUser.create({
        email: data.email,
        phone_number: "",
        role: "g-ind", // Social login user
        picture: data.picture?.data?.url,
        sub: data.id, // Facebook user ID
        email_verified: true, // Facebook emails are verified
        name: data.name,
      });
      console.log("✅ Created new user via Facebook login:", {
        id: user._id,
        email: user.email,
      });
    } else {
      // Update existing user with latest Facebook data
      user.picture = data.picture?.data?.url || user.picture;
      user.name = data.name || user.name;
      user.email_verified = true;
      await user.save();
      console.log("✅ Updated existing user:", user._id);
    }

    // Send welcome email for new users
    if (isNewUser) {
      await sendWelcomeEmail(user.email).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });
    }

    // Get user agent
    const userAgent = req.get("User-Agent") || "unknown";

    console.log("🎫 Creating session for user:", user._id);

    // Create session and generate tokens
    const result = await createSessionAndSendTokens({
      user: user.toObject(),
      userAgent: userAgent,
      role: "g-ind",
      message: isNewUser ? "Account created successfully" : "Login successful",
    });

    console.log("✅ Session created successfully");

    // Set cookies
    const accessCookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

    res.cookie("access_token", result.accessToken, accessCookieOptions);
    res.cookie("refresh_token", result.refreshToken, refreshCookieOptions);

    // 🔥 FIXED: Consistent user response structure
    const responseUser = {
      id: user._id.toString(),
      _id: user._id.toString(), // Add this for consistency
      email: user.email,
      phone_number: user.phone_number || "",
      role: user.role,
      picture: user.picture,
      email_verified: user.email_verified,
      name: user.name,
      username: user.username,
      profile_picture: user.picture, // Add alias
    };

    console.log("✅ Facebook login successful:", {
      userId: responseUser.id,
      email: responseUser.email,
    });

    res.status(200).json({
      status: "success",
      message: result.message,
      user: responseUser,
      token: result.accessToken, // Add for consistency
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error("❌ Facebook login error:", {
      message: error.response?.data || error.message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    let message = "Facebook authentication failed";

    // Parse Facebook API errors
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      if (fbError.code === 190) {
        message = "Invalid Facebook token. Please try logging in again.";
      } else if (fbError.code === 104) {
        message = "Facebook API limit reached. Please try again later.";
      }
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message,
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const updateTwitterUserEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "User ID and email are required",
      };
      return next(error);
    }

    // Validate email format
    if (!emailValidator(email)) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid email format",
      };
      return next(error);
    }

    // Check if email already exists
    const existingUser = await IndividualUser.findOne({ email });
    if (existingUser && String(existingUser._id) !== String(userId)) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Email already in use",
      };
      return next(error);
    }

    // Update user email
    const user = await IndividualUser.findByIdAndUpdate(
      userId,
      {
        email: email,
        email_verified: false, // Email needs verification
      },
      { new: true },
    );

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" },
    );

    // Send email verification
    await sendVerificationEmail(user.email, verificationToken).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    // 🔥 FIXED: Consistent response structure
    const responseUser = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      picture: user.picture,
      email_verified: user.email_verified,
      name: user.name,
      username: user.username,
      profile_picture: user.picture,
    };

    res.status(200).json({
      status: "success",
      message:
        "Email updated successfully. Please check your email for verification.",
      user: responseUser,
    });
  } catch (error) {
    console.error("Email update error:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Failed to update email",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
