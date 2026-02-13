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
exports.generateAccessAndRefreshToken = generateAccessAndRefreshToken;
exports.reIssueAccessToken = reIssueAccessToken;
const lodash_1 = require("lodash");
const signAndVerifyToken_util_1 = require("./signAndVerifyToken.util");
const session_model_1 = require("../modules/sessions/session.model");
const individualUserAuth_model1_1 = __importDefault(require("../modules/authentication/individualUserAuth/individualUserAuth.model1"));
// At the top of the file
const ACCESS_TOKEN_EXPIRY = "1d";
const REFRESH_TOKEN_EXPIRY = "7d";
function generateAccessAndRefreshToken(userObject, sessionId, role) {
    //Extract email
    const userEmail = userObject.email ||
        userObject.organization_email ||
        userObject.contact_email;
    const tokenPayload = {
        userData: {
            _id: userObject._id,
            role: userObject.role,
            email: userEmail,
        },
        session: sessionId.toString(),
        role,
    };
    const accessToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, {
        expiresIn: process.env.ACCESS_TOKEN_TTL || ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = (0, signAndVerifyToken_util_1.signJwt)(tokenPayload, {
        expiresIn: process.env.REFRESH_TOKEN_TTL || REFRESH_TOKEN_EXPIRY,
    });
    return { accessToken, refreshToken };
}
function reIssueAccessToken(_a) {
    return __awaiter(this, arguments, void 0, function* ({ refreshToken, }) {
        const { decoded } = (0, signAndVerifyToken_util_1.verifyJwt)(refreshToken);
        if (!decoded || !(0, lodash_1.get)(decoded, "session"))
            return false;
        const session = yield session_model_1.Session.findById((0, lodash_1.get)(decoded, "session"));
        if (!session || !session.valid)
            return false;
        let user;
        if (session.role === "ind" || session.role === "g-ind") {
            user = yield individualUserAuth_model1_1.default
                .findById(session.user)
                .select("_id email role");
        }
        else {
            user = undefined;
        }
        if (!user)
            return false;
        const accessTokenTTL = process.env.ACCESS_TOKEN_TTL || "1d";
        // Extract email from user
        const userEmail = user.email || user.organization_email || user.contact_email;
        const accessToken = (0, signAndVerifyToken_util_1.signJwt)({
            userData: {
                _id: user._id.toString(),
                role: session.role,
                // email: userEmail, // ADD THIS
            },
            session: session._id.toString(),
            role: session.role,
        }, { expiresIn: accessTokenTTL });
        return accessToken;
    });
}
