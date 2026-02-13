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
exports.ROLES = exports.requireRole = exports.resourceAccess = exports.resourceOwnerOnly = exports.superAdminOnly = exports.mediatorOnly = exports.organizationOnly = exports.individualOnly = exports.adminOnly = exports.restrictTo = exports.verifyAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Helper function to extract and validate user data from JWT payload
 */
const extractUserFromToken = (decoded) => {
    // Handle both nested (userData) and flat structures
    const userData = decoded.userData || decoded;
    const userId = userData._id || userData.id || userData.userId;
    const userEmail = userData.email;
    const userRole = decoded.role || userData.role; // Use top-level role if available
    // Validate required fields
    if (!userId || !userEmail || !userRole) {
        console.error("❌ Missing required user data in token:", {
            userId,
            userEmail,
            userRole,
            decoded,
        });
        throw new Error("Invalid token: Missing user data");
    }
    return {
        _id: userId,
        id: userId,
        email: userEmail,
        role: userRole,
        session: decoded.session || decoded.sessionId,
        iat: decoded.iat,
        exp: decoded.exp,
    };
};
/**
 * Middleware to verify user is authenticated and has valid tokens
 */
const verifyAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Get token from cookies or headers
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.access_token) ||
            ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", ""));
        if (!token) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "Authentication required. Please log in to continue.",
            };
            return next(error);
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Ensure decoded is an object
        if (typeof decoded === "string" || !decoded) {
            throw new Error("Invalid token payload");
        }
        // Extract and set user data on request
        req.user = extractUserFromToken(decoded);
        next();
    }
    catch (error) {
        const errResponse = {
            statusCode: 401,
            status: "fail",
            message: error instanceof jsonwebtoken_1.default.TokenExpiredError
                ? "Token expired. Please log in again."
                : error instanceof jsonwebtoken_1.default.JsonWebTokenError
                    ? "Invalid authentication token."
                    : "Authentication failed.",
        };
        next(errResponse);
    }
});
exports.verifyAuth = verifyAuth;
/**
 * Helper function to check if user is authenticated
 */
const requireAuth = (req) => {
    if (!req.user) {
        return {
            statusCode: 401,
            status: "fail",
            message: "Authentication required.",
        };
    }
    return null;
};
/**
 * Helper function to check if user has required role
 */
const checkRole = (req, allowedRoles, errorMessage) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return {
            statusCode: 403,
            status: "fail",
            message: errorMessage,
        };
    }
    return null;
};
/**
 * Middleware factory to restrict access to specific roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
const restrictTo = (allowedRoles) => {
    return (req, res, next) => {
        const authError = requireAuth(req);
        if (authError)
            return next(authError);
        const roleError = checkRole(req, allowedRoles, `Access denied. This action is restricted to: ${allowedRoles.join(", ")} users only.`);
        if (roleError)
            return next(roleError);
        next();
    };
};
exports.restrictTo = restrictTo;
/**
 * Middleware to verify only admin users can access
 */
const adminOnly = (req, res, next) => {
    const authError = requireAuth(req);
    if (authError)
        return next(authError);
    const roleError = checkRole(req, ["admin", "super-admin"], "Access denied. Admin privileges required.");
    if (roleError)
        return next(roleError);
    next();
};
exports.adminOnly = adminOnly;
/**
 * Middleware to verify only individual users can access
 */
const individualOnly = (req, res, next) => {
    const authError = requireAuth(req);
    if (authError)
        return next(authError);
    const roleError = checkRole(req, ["ind", "g-ind"], "Access denied. Individual user account required.");
    if (roleError)
        return next(roleError);
    next();
};
exports.individualOnly = individualOnly;
/**
 * Middleware to verify only organization users can access
 */
const organizationOnly = (req, res, next) => {
    const authError = requireAuth(req);
    if (authError)
        return next(authError);
    const roleError = checkRole(req, ["org", "g-org"], "Access denied. Organization account required.");
    if (roleError)
        return next(roleError);
    next();
};
exports.organizationOnly = organizationOnly;
/**
 * Middleware to verify only mediator users can access
 */
const mediatorOnly = (req, res, next) => {
    const authError = requireAuth(req);
    if (authError)
        return next(authError);
    const roleError = checkRole(req, ["mediator"], "Access denied. Mediator account required.");
    if (roleError)
        return next(roleError);
    next();
};
exports.mediatorOnly = mediatorOnly;
/**
 * Middleware to verify super admin only
 */
const superAdminOnly = (req, res, next) => {
    const authError = requireAuth(req);
    if (authError)
        return next(authError);
    const roleError = checkRole(req, ["super-admin"], "Access denied. Super admin privileges required.");
    if (roleError)
        return next(roleError);
    next();
};
exports.superAdminOnly = superAdminOnly;
/**
 * Middleware to verify user owns the resource (by ID)
 * @param idField - The field name in req.params that contains the resource ID (default: 'id')
 * @param resourceType - Optional resource type for better error messages
 */
const resourceOwnerOnly = (idField = "id", resourceType) => {
    return (req, res, next) => {
        var _a, _b, _c;
        const authError = requireAuth(req);
        if (authError)
            return next(authError);
        const resourceId = req.params[idField];
        if (!resourceId) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: `Resource ID (${idField}) is required.`,
            };
            return next(error);
        }
        // Check if user is super admin (super admins can access any resource)
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === "super-admin") {
            return next();
        }
        // Check if user owns the resource
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b._id) !== resourceId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) !== resourceId) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: resourceType
                    ? `Access denied. You do not own this ${resourceType}.`
                    : "Access denied. You do not own this resource.",
            };
            return next(error);
        }
        next();
    };
};
exports.resourceOwnerOnly = resourceOwnerOnly;
/**
 * Middleware to verify user can access the resource (owner or admin)
 * @param idField - The field name in req.params that contains the resource ID (default: 'id')
 * @param resourceType - Optional resource type for better error messages
 */
const resourceAccess = (idField = "id", resourceType) => {
    return (req, res, next) => {
        var _a, _b, _c, _d;
        const authError = requireAuth(req);
        if (authError)
            return next(authError);
        const resourceId = req.params[idField];
        if (!resourceId) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: `Resource ID (${idField}) is required.`,
            };
            return next(error);
        }
        // Check if user is admin or super admin
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === "admin" || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "super-admin") {
            return next();
        }
        // Check if user owns the resource
        if (((_c = req.user) === null || _c === void 0 ? void 0 : _c._id) === resourceId || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.id) === resourceId) {
            return next();
        }
        const error = {
            statusCode: 403,
            status: "fail",
            message: resourceType
                ? `Access denied. You do not have permission to access this ${resourceType}.`
                : "Access denied. You do not have permission to access this resource.",
        };
        return next(error);
    };
};
exports.resourceAccess = resourceAccess;
/**
 * Combined middleware that checks both authentication and specific role
 * This is useful when you need both checks in a single middleware
 */
const requireRole = (allowedRoles) => {
    return [exports.verifyAuth, (0, exports.restrictTo)(allowedRoles)];
};
exports.requireRole = requireRole;
// Export commonly used role arrays for convenience
exports.ROLES = {
    ADMIN: ["admin", "super-admin"],
    INDIVIDUAL: ["ind", "g-ind"],
    ORGANIZATION: ["org", "g-org"],
    MEDIATOR: ["mediator"],
    ALL_USERS: [
        "ind",
        "g-ind",
        "org",
        "g-org",
        "mediator",
        "admin",
        "super-admin",
    ],
};
