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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionAndSendTokens = void 0;
const signAndVerifyToken_util_1 = require("./signAndVerifyToken.util");
const session_model_1 = require("../modules/sessions/session.model");
const createSessionAndSendTokens = (_a) => __awaiter(void 0, [_a], void 0, function* ({ user, userAgent, role, message = "Login successful", }) {
    // Use user.role if provided, otherwise use the role parameter
    const userRole = user.role || role;
    // ✅ Get email (handle both individual and organization users)
    const userEmail = user.email || user.organization_email || user.contact_email;
    if (!userEmail) {
        throw new Error("User email is required for session creation");
    }
    // Create session with empty refreshToken initially
    const session = yield session_model_1.Session.create({
        user: user._id,
        userAgent: userAgent || "unknown",
        role: userRole,
        valid: true,
        refreshToken: "",
    });
    // Convert session._id to string for JWT payload
    const sessionId = session._id.toString();
    const userId = user._id.toString();
    // UPDATED: Include email in token payload
    const tokenPayload = {
        userData: {
            _id: userId,
            role: userRole,
            email: userEmail,
        },
        session: sessionId,
        role: userRole,
    };
    // Generate tokens with email included
    const accessToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, { expiresIn: "1d" });
    const refreshToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, { expiresIn: "30d" });
    // Update session with refreshToken
    session.refreshToken = refreshToken;
    yield session.save();
    return {
        accessToken,
        refreshToken,
        message,
        user: Object.assign(Object.assign({}, user), { role: userRole }),
        status: "success",
        sessionId,
    };
});
exports.createSessionAndSendTokens = createSessionAndSendTokens;
