import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { ErrorResponse } from "../utilities/errorHandler.util";

// Helper function to safely get IP address with IPv6 support
const getClientIp = (req: Request): string => {
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
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    console.log("✅ Redis connected for rate limiting");
  } catch (error) {
    console.warn("⚠️ Redis connection failed, using in-memory rate limiting");
  }
}

// Store for memory-based rate limiting (fallback)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Custom store for Redis
const createRedisStore = () => {
  return {
    async increment(
      key: string,
    ): Promise<{ totalHits: number; resetTime: Date }> {
      if (!redisClient) {
        throw new Error("Redis client not available");
      }

      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const resetTime = new Date(now + windowMs);

      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, Math.floor(windowMs / 1000));
      }

      return { totalHits: count, resetTime };
    },

    async decrement(key: string): Promise<void> {
      if (redisClient) {
        await redisClient.decr(key);
      }
    },

    async resetKey(key: string): Promise<void> {
      if (redisClient) {
        await redisClient.del(key);
      }
    },
  };
};

// Custom store for memory
const createMemoryStore = () => {
  return {
    increment(key: string): { totalHits: number; resetTime: Date } {
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

    decrement(key: string): void {
      const data = memoryStore.get(key);
      if (data && data.count > 0) {
        data.count--;
        memoryStore.set(key, data);
      }
    },

    resetKey(key: string): void {
      memoryStore.delete(key);
    },
  };
};

interface RateLimiterOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  message?: string; // Error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipFailedRequests?: boolean; // Don't count failed requests
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean; // Disable X-RateLimit headers
}

/**
 * Flexible rate limiter middleware
 */
export const rateLimiter = (options: RateLimiterOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = "Too many requests, please try again later.",
    keyGenerator = (req) => {
      // Default key: IP + method + path
      // Use helper function to properly handle IPv6 addresses
      const ip = getClientIp(req);
      return `${ip}:${req.method}:${req.path}`;
    },
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    keyGenerator,
    skipFailedRequests,
    skipSuccessfulRequests,
    standardHeaders,
    legacyHeaders,
    handler: (req: Request, res: Response, next: NextFunction, options) => {
      const errorResponse: ErrorResponse = {
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

/**
 * Rate limiter for specific endpoints with tighter limits
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many attempts, please slow down.",
});

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimiter({
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
export const feedbackRateLimiter = rateLimiter({
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
export const scanRateLimiter = rateLimiter({
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
export const apiKeyRateLimiter = (apiKey?: string) => {
  return rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: apiKey ? 100 : 10, // 100 with API key, 10 without
    message:
      "API rate limit exceeded. Please use an API key for higher limits.",
    keyGenerator: (req) => {
      const key = req.headers["x-api-key"] || "anonymous";
      return `api:${key}`;
    },
  });
};

/**
 * Skip rate limiting for specific IPs or conditions
 */
export const skipRateLimit = (req: Request): boolean => {
  // Add trusted IPs or conditions here
  const trustedIps = ["127.0.0.1", "::1", "localhost"];
  const ip = getClientIp(req); // Use helper function

  return trustedIps.includes(ip || "");
};

// Export types
export type { RateLimiterOptions };
