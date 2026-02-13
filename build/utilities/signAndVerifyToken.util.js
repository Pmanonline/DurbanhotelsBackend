"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = exports.signJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const signJwt = (payload, options) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    return jsonwebtoken_1.default.sign(payload, secret, Object.assign({}, (options && options)));
};
exports.signJwt = signJwt;
const verifyJwt = (token) => {
    var _a;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return {
            decoded,
            expired: false,
            valid: true,
        };
    }
    catch (error) {
        return {
            decoded: null,
            expired: (_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("jwt expired"),
            valid: false,
        };
    }
};
exports.verifyJwt = verifyJwt;
