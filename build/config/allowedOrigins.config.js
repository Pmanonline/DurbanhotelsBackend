"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://qr-genius-frontend.vercel.app",
    "http://localhost:3000",
].filter(Boolean);
exports.default = allowedOrigins;
