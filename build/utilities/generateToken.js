"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessAndRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.ACCESS_TOKEN_SECRET || "secret", {
        expiresIn: "1h",
    });
};
exports.generateAccessToken = generateAccessToken;
const generateAccessAndRefreshToken = (userId) => {
    const accessToken = (0, exports.generateAccessToken)(userId);
    const refreshToken = jsonwebtoken_1.default.sign({ userId }, process.env.REFRESH_TOKEN_SECRET || "secret", {
        expiresIn: "7d",
    });
    return { accessToken, refreshToken };
};
exports.generateAccessAndRefreshToken = generateAccessAndRefreshToken;
