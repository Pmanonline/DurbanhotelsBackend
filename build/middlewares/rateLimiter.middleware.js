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
exports.skipRateLimit = exports.apiKeyRateLimiter = exports.scanRateLimiter = exports.feedbackRateLimiter = exports.authRateLimiter = exports.strictRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ioredis_1 = __importDefault(require("ioredis"));
// Helper function to safely get IP address with IPv6 support
const getClientIp = (req) => {
    // Get IP from various possible sources
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
        ? typeof forwarded === "string"
            ? forwarded.split(",")[0]
            : forwarded[0]
        : req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            "unknown";
    // Normalize IPv6 addresses
    // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
        return ip.substring(7);
    }
    return ip;
};
// Redis client for distributed rate limiting (optional)
let redisClient = null;
if (process.env.REDIS_URL) {
    try {
        redisClient = new ioredis_1.default(process.env.REDIS_URL);
        console.log("✅ Redis connected for rate limiting");
    }
    catch (error) {
        console.warn("⚠️ Redis connection failed, using in-memory rate limiting");
    }
}
// Store for memory-based rate limiting (fallback)
const memoryStore = new Map();
// Custom store for Redis
const createRedisStore = () => {
    return {
        increment(key) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!redisClient) {
                    throw new Error("Redis client not available");
                }
                const now = Date.now();
                const windowMs = 15 * 60 * 1000; // 15 minutes
                const resetTime = new Date(now + windowMs);
                const count = yield redisClient.incr(key);
                if (count === 1) {
                    yield redisClient.expire(key, Math.floor(windowMs / 1000));
                }
                return { totalHits: count, resetTime };
            });
        },
        decrement(key) {
            return __awaiter(this, void 0, void 0, function* () {
                if (redisClient) {
                    yield redisClient.decr(key);
                }
            });
        },
        resetKey(key) {
            return __awaiter(this, void 0, void 0, function* () {
                if (redisClient) {
                    yield redisClient.del(key);
                }
            });
        },
    };
};
// Custom store for memory
const createMemoryStore = () => {
    return {
        increment(key) {
            const now = Date.now();
            const windowMs = 15 * 60 * 1000; // 15 minutes
            const data = memoryStore.get(key) || {
                count: 0,
                resetTime: now + windowMs,
            };
            // Reset if window has passed
            if (now > data.resetTime) {
                data.count = 0;
                data.resetTime = now + windowMs;
            }
            data.count++;
            memoryStore.set(key, data);
            return { totalHits: data.count, resetTime: new Date(data.resetTime) };
        },
        decrement(key) {
            const data = memoryStore.get(key);
            if (data && data.count > 0) {
                data.count--;
                memoryStore.set(key, data);
            }
        },
        resetKey(key) {
            memoryStore.delete(key);
        },
    };
};
/**
 * Flexible rate limiter middleware
 */
const rateLimiter = (options = {}) => {
    const { windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = "Too many requests, please try again later.", keyGenerator = (req) => {
        // Default key: IP + method + path
        // Use helper function to properly handle IPv6 addresses
        const ip = getClientIp(req);
        return `${ip}:${req.method}:${req.path}`;
    }, skipFailedRequests = false, skipSuccessfulRequests = false, standardHeaders = true, legacyHeaders = false, } = options;
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message,
        keyGenerator,
        skipFailedRequests,
        skipSuccessfulRequests,
        standardHeaders,
        legacyHeaders,
        handler: (req, res, next, options) => {
            const errorResponse = {
                statusCode: 429,
                status: "fail",
                message: options.message,
            };
            // Add rate limit headers if enabled
            if (standardHeaders) {
                res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
                res.setHeader("X-RateLimit-Limit", max.toString());
            }
            return res.status(429).json(errorResponse);
        },
        store: redisClient ? createRedisStore() : createMemoryStore(),
    });
};
exports.rateLimiter = rateLimiter;
/**
 * Rate limiter for specific endpoints with tighter limits
 */
exports.strictRateLimiter = (0, exports.rateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: "Too many attempts, please slow down.",
});
/**
 * Rate limiter for authentication endpoints
 */
exports.authRateLimiter = (0, exports.rateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: "Too many login attempts, please try again later.",
    keyGenerator: (req) => {
        // Use email for auth endpoints to prevent brute force
        const email = req.body.email || "unknown";
        return `auth:${email}`;
    },
});
/**
 * Rate limiter for feedback submissions
 */
exports.feedbackRateLimiter = (0, exports.rateLimiter)({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 feedbacks per day per IP
    message: "Too many feedback submissions today. Please try again tomorrow.",
    keyGenerator: (req) => {
        // Use helper function for IPv6 support
        const ip = getClientIp(req);
        const menuId = req.body.menu_id || "unknown";
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        return `feedback:${ip}:${menuId}:${today}`;
    },
});
/**
 * Rate limiter for QR code scans
 */
exports.scanRateLimiter = (0, exports.rateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 scans per minute
    message: "Scan rate limit exceeded. Please try again in a moment.",
    keyGenerator: (req) => {
        // Use helper function for IPv6 support
        const ip = getClientIp(req);
        return `scan:${ip}`;
    },
});
/**
 * Rate limiter for API keys
 */
const apiKeyRateLimiter = (apiKey) => {
    return (0, exports.rateLimiter)({
        windowMs: 60 * 1000, // 1 minute
        max: apiKey ? 100 : 10, // 100 with API key, 10 without
        message: "API rate limit exceeded. Please use an API key for higher limits.",
        keyGenerator: (req) => {
            const key = req.headers["x-api-key"] || "anonymous";
            return `api:${key}`;
        },
    });
};
exports.apiKeyRateLimiter = apiKeyRateLimiter;
/**
 * Skip rate limiting for specific IPs or conditions
 */
const skipRateLimit = (req) => {
    // Add trusted IPs or conditions here
    const trustedIps = ["127.0.0.1", "::1", "localhost"];
    const ip = getClientIp(req); // Use helper function
    return trustedIps.includes(ip || "");
};
exports.skipRateLimit = skipRateLimit;
