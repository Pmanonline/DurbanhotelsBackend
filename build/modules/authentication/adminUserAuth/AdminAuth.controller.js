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
exports.resetAdminPassword = exports.forgotAdminPassword = exports.resendAdminVerificationEmail = exports.verifyAdminEmail = exports.adminUserLogin = exports.adminUserRegistration = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const adminAuth_model_1 = __importDefault(require("./adminAuth.model"));
const adminEmailTemplate_1 = require("../adminUserAuth/adminEmailTemplate");
const bcrypt_1 = __importDefault(require("bcrypt"));
const createSessionAndSendToken_util_1 = require("../../../utilities/createSessionAndSendToken.util");
const crypto_1 = __importDefault(require("crypto"));
const cookieConfig_util_1 = require("../../../utilities/cookieConfig.util");
const adminUserRegistration = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone_number, password, confirm_password, name, username } = req.body;
        if (!email || !password || !confirm_password || !name) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "All fields (email, name, password, confirm_password) are required",
            };
            return next(error);
        }
        if (password !== confirm_password) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "Passwords do not match",
            };
            return next(error);
        }
        const adminEmailAlreadyExist = yield adminAuth_model_1.default.findOne({ email });
        if (adminEmailAlreadyExist) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Admin user already exists, please proceed to login",
            };
            return next(error);
        }
        const newAdmin = new adminAuth_model_1.default({
            email,
            phone_number,
            password,
            name,
            username: username || email.split("@")[0],
            role: "admin",
            isSuperAdmin: false,
        });
        yield newAdmin.save();
        const verificationToken = jsonwebtoken_1.default.sign({ email: newAdmin.email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" });
        yield (0, adminEmailTemplate_1.sendAdminVerificationEmail)(email, verificationToken);
        res.status(201).json({
            status: "success",
            message: "Admin account created successfully! Verification email sent. Please verify your account to continue. Note that token expires in 2 hours",
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error registering the admin user",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.adminUserRegistration = adminUserRegistration;
const adminUserLogin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email and password are required",
            };
            return next(error);
        }
        const admin = yield adminAuth_model_1.default.findOne({ email }).select("+password");
        if (!admin) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Admin user not found",
            };
            return next(error);
        }
        if (!admin.email_verified) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Please verify your email before logging in",
            };
            return next(error);
        }
        const isMatch = yield bcrypt_1.default.compare(password, admin.password);
        if (!isMatch) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "Invalid email or password",
            };
            return next(error);
        }
        const userAgent = req.get("User-Agent") || "unknown";
        const result = yield (0, createSessionAndSendToken_util_1.createSessionAndSendTokens)({
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
        res.cookie("access_token", result.accessToken, (0, cookieConfig_util_1.getCookieOptions)(15 * 60 * 1000) // 15 minutes
        );
        res.cookie("refresh_token", result.refreshToken, (0, cookieConfig_util_1.getCookieOptions)(30 * 24 * 60 * 60 * 1000) // 30 days (changed from 7 for consistency)
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
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error logging in admin",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.adminUserLogin = adminUserLogin;
const verifyAdminEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (decoded.role !== "admin") {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Invalid token for admin verification",
            };
            return next(error);
        }
        const admin = yield adminAuth_model_1.default.findOne({ email: decoded.email });
        if (!admin) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Admin user not found",
            };
            return next(error);
        }
        if (admin.email_verified) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email already verified",
            };
            return next(error);
        }
        admin.email_verified = true;
        yield admin.save();
        yield (0, adminEmailTemplate_1.sendAdminWelcomeEmail)(admin.email, admin.name);
        res.status(200).json({
            status: "success",
            message: "Admin email verified successfully! You can now login to your account",
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
exports.verifyAdminEmail = verifyAdminEmail;
const resendAdminVerificationEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const admin = yield adminAuth_model_1.default.findOne({ email });
        if (!admin) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Admin user not found",
            };
            return next(error);
        }
        if (admin.email_verified) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Email is already verified",
            };
            return next(error);
        }
        const verificationToken = jsonwebtoken_1.default.sign({ email: admin.email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" });
        yield (0, adminEmailTemplate_1.sendAdminVerificationEmail)(email, verificationToken);
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
exports.resendAdminVerificationEmail = resendAdminVerificationEmail;
const forgotAdminPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const admin = yield adminAuth_model_1.default.findOne({ email });
        if (!admin) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Admin user with this email does not exist",
            };
            return next(error);
        }
        const resetToken = admin.createPasswordResetToken();
        yield admin.save({ validateBeforeSave: false });
        yield (0, adminEmailTemplate_1.sendAdminPasswordResetEmail)(email, resetToken);
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
exports.forgotAdminPassword = forgotAdminPassword;
const resetAdminPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        const { password, confirm_password } = req.body;
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
        const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const admin = yield adminAuth_model_1.default.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!admin) {
            const error = {
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
        yield admin.save();
        yield (0, adminEmailTemplate_1.sendAdminPasswordResetSuccessEmail)(admin.email);
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
exports.resetAdminPassword = resetAdminPassword;
