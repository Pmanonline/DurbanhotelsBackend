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
exports.refreshAccessToken = void 0;
const signAndVerifyToken_util_1 = require("./signAndVerifyToken.util");
const session_model_1 = require("../modules/sessions/session.model");
const individualUserAuth_model1_1 = __importDefault(require("../modules/authentication/individualUserAuth/individualUserAuth.model1"));
const cookieConfig_util_1 = require("./cookieConfig.util");
const refreshAccessToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refreshToken = req.body.refreshToken || req.cookies["refresh_token"];
        if (!refreshToken) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "No refresh token provided",
            };
            return next(error);
        }
        const { decoded, valid, expired } = (0, signAndVerifyToken_util_1.verifyJwt)(refreshToken);
        if (!valid || !decoded) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: expired ? "Refresh token expired" : "Invalid refresh token",
            };
            return next(error);
        }
        const sessionId = decoded.session;
        if (!sessionId) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Invalid token format - no session found",
            };
            return next(error);
        }
        const session = yield session_model_1.Session.findById(sessionId);
        if (!session || !session.valid) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Session not found or invalid",
            };
            return next(error);
        }
        if (session.refreshToken !== refreshToken) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "Refresh token mismatch - possible token reuse detected",
            };
            return next(error);
        }
        let user = null;
        if (session.role === "ind" || session.role === "g-ind") {
            user = yield individualUserAuth_model1_1.default.findById(session.user).select("_id email phone_number role");
        }
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // ✅ FIXED: Include email in the token payload
        const tokenPayload = {
            userData: {
                _id: session.user.toString(),
                email: user.email, // ✅ ADD THIS - Critical fix!
                role: session.role,
            },
            session: session._id.toString(),
            role: session.role,
        };
        // Generate new access token with complete user data
        const newAccessToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, { expiresIn: "1d" });
        // Generate new refresh token (token rotation) with complete user data
        const newRefreshToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, { expiresIn: "30d" });
        // Update session with new refresh token
        session.refreshToken = newRefreshToken;
        yield session.save();
        res.cookie("access_token", newAccessToken, (0, cookieConfig_util_1.getCookieOptions)(1 * 60 * 1000));
        res.cookie("refresh_token", newRefreshToken, (0, cookieConfig_util_1.getCookieOptions)(30 * 24 * 60 * 60 * 1000));
        return res.status(200).json({
            status: "success",
            message: "Access token refreshed successfully",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user._id,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role || session.role,
            },
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error refreshing access token",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.refreshAccessToken = refreshAccessToken;
