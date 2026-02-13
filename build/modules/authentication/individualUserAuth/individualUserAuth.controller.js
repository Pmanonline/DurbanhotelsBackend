"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetIndividualPassword = exports.forgotPassword = exports.resendVerificationEmail = exports.verifyEmail = exports.individualUserLogin = exports.individualUserRegistration = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const individualUserAuth_model1_1 = __importDefault(require("./individualUserAuth.model1"));
const email_utils_1 = require("../../../utilities/email.utils");
const bcrypt_1 = __importDefault(require("bcrypt"));
const createSessionAndSendToken_util_1 = require("../../../utilities/createSessionAndSendToken.util");
const crypto_1 = __importDefault(require("crypto"));
const cookieConfig_util_1 = require("../../../utilities/cookieConfig.util");
const individualUserRegistration = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone_number, password, confirm_password } = req.body;
        if (!email || !phone_number || !password || !confirm_password) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "All fields (email, phone_number, password, confirm_password) are required",
            };
            return next(error);
        }
        if (password !== confirm_password) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "Password do not match",
            };
            return next(error);
        }
        const individualEmailAlreadyExist = yield individualUserAuth_model1_1.default.findOne({ email });
        const newUser = new individualUserAuth_model1_1.default({
            email,
            phone_number,
            password,
            role: "ind",
        });
        yield newUser.save();
        const verificationToken = jsonwebtoken_1.default.sign({ email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "2h" });
        // Create verification URL and send email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        // Fix: Check your email utility function signature
        // Option 1: If it expects email and token separately
        yield (0, email_utils_1.sendVerificationEmail)(email, verificationToken);
        // Option 2: If it expects email and URL
        // await sendVerificationEmail(email, verificationUrl);
        // Option 3: If it expects an object
        // await sendVerificationEmail({ email, token: verificationToken });
        res.status(201).json({
            status: "success",
            message: "Account created successfully! Verification email sent. Please verify your account to continue. Note that token expires in 2 hours",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error registering the user",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.individualUserRegistration = individualUserRegistration;
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
const individualUserLogin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email and password are required",
            };
            return next(error);
        }
        const user = yield individualUserAuth_model1_1.default.findOne({ email }).select("+password");
        if (!user) {
            console.log("❌ User not found:", email);
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Invalid email or password",
            };
            return next(error);
        }
        if (!user.email_verified) {
            console.log("⚠️ Email not verified:", email);
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Please verify your email before logging in",
            };
            return next(error);
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Password mismatch for:", email);
            const error = {
                statusCode: 401,
                status: "fail",
                message: "Invalid email or password",
            };
            return next(error);
        }
        const userAgent = req.get("User-Agent") || "unknown";
        console.log("🎫 Creating session for user:", user._id);
        const result = yield (0, createSessionAndSendToken_util_1.createSessionAndSendTokens)({
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
        const accessCookieOptions = (0, cookieConfig_util_1.getCookieOptions)(1 * 24 * 60 * 60 * 1000);
        const refreshCookieOptions = (0, cookieConfig_util_1.getCookieOptions)(30 * 24 * 60 * 60 * 1000);
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
    }
    catch (error) {
        console.error("❌ Login error:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            email: req.body.email,
        });
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error logging in",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.individualUserLogin = individualUserLogin;
const verifyEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Invalid or missing token",
            };
            return next(error);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield individualUserAuth_model1_1.default.findOne({ email: decoded.email });
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        if (user.email_verified) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email already verified",
            };
            return next(error);
        }
        user.email_verified = true;
        yield user.save();
        // Send welcome email after successful verification
        yield (0, email_utils_1.sendWelcomeEmail)(user.email);
        res.status(200).json({
            status: "success",
            message: "Email verified successfully! You can now login to your account",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: error instanceof jsonwebtoken_1.default.JsonWebTokenError ? 400 : 500,
            status: "fail",
            message: error instanceof jsonwebtoken_1.default.JsonWebTokenError
                ? "Invalid or expired token"
                : "Error verifying email",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.verifyEmail = verifyEmail;
const resendVerificationEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email is required",
            };
            return next(error);
        }
        const user = yield individualUserAuth_model1_1.default.findOne({ email });
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        if (user.email_verified) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email is already verified",
            };
            return next(error);
        }
        const verificationToken = jsonwebtoken_1.default.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "2h" });
        yield (0, email_utils_1.sendVerificationEmail)(email, verificationToken);
        res.status(200).json({
            status: "success",
            message: "Verification email resent successfully. Please check your inbox",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error resending verification email",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.resendVerificationEmail = resendVerificationEmail;
// FIXED forgotPassword function
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email is required",
            };
            return next(error);
        }
        const user = yield individualUserAuth_model1_1.default.findOne({ email });
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User with this email does not exist",
            };
            return next(error);
        }
        // This returns the UNHASHED token to send via email
        const resetToken = user.createPasswordResetToken();
        // Save the user with the hashed token and expiry
        yield user.save({ validateBeforeSave: false });
        // Send reset email with the UNHASHED token
        yield (0, email_utils_1.sendPasswordResetEmail)(email, resetToken);
        res.status(200).json({
            status: "success",
            message: "Password reset link sent to your email. Link expires in 10 minutes",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error processing forgot password request",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.forgotPassword = forgotPassword;
// FIXED resetIndividualPassword function
const resetIndividualPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        const { password, confirm_password } = req.body;
        // Validation Checks
        if (!token || typeof token !== "string") {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Invalid or missing token",
            };
            return next(error);
        }
        if (!password || !confirm_password) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Password and confirm password are required",
            };
            return next(error);
        }
        if (password !== confirm_password) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Passwords do not match",
            };
            return next(error);
        }
        // Hash the incoming token the same way it was stored
        const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
        // Find user with matching hashed token and unexpired date
        const user = yield individualUserAuth_model1_1.default.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!user) {
            const error = {
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
        yield user.save();
        // Send success email
        yield (0, email_utils_1.sendPasswordResetSuccessEmail)(user.email);
        res.status(200).json({
            status: "success",
            message: "Password reset successfully! You can now login with your new password",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error resetting password",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.resetIndividualPassword = resetIndividualPassword;
