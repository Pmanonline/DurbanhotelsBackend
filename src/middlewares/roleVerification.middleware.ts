// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../utilities/errorHandler.util";
import jwt from "jsonwebtoken";
import IndividualUser from "../modules/authentication/individualUserAuth/individualUserAuth.model1";
import AdminUser from "../modules/authentication/adminUserAuth/adminAuth.model";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        id: string;
        email: string;
        role: string;
        session?: string;
        iat?: number;
        exp?: number;
        [key: string]: any; // Allow additional properties
      };
    }
  }
}

/**
 * Helper function to extract and validate user data from JWT payload
 */
const extractUserFromToken = (decoded: any): Express.Request["user"] => {
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
export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from cookies or headers
    const token =
      req.cookies?.access_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Authentication required. Please log in to continue.",
      };
      return next(error);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // Ensure decoded is an object
    if (typeof decoded === "string" || !decoded) {
      throw new Error("Invalid token payload");
    }

    // Extract and set user data on request
    req.user = extractUserFromToken(decoded);

    next();
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message:
        error instanceof jwt.TokenExpiredError
          ? "Token expired. Please log in again."
          : error instanceof jwt.JsonWebTokenError
            ? "Invalid authentication token."
            : "Authentication failed.",
    };
    next(errResponse);
  }
};

/**
 * Helper function to check if user is authenticated
 */
const requireAuth = (req: Request): ErrorResponse | null => {
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
const checkRole = (
  req: Request,
  allowedRoles: string[],
  errorMessage: string,
): ErrorResponse | null => {
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
export const restrictTo = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authError = requireAuth(req);
    if (authError) return next(authError);

    const roleError = checkRole(
      req,
      allowedRoles,
      `Access denied. This action is restricted to: ${allowedRoles.join(", ")} users only.`,
    );
    if (roleError) return next(roleError);

    next();
  };
};

/**
 * Middleware to verify only admin users can access
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const authError = requireAuth(req);
  if (authError) return next(authError);

  const roleError = checkRole(
    req,
    ["admin", "super-admin"],
    "Access denied. Admin privileges required.",
  );
  if (roleError) return next(roleError);

  next();
};

/**
 * Middleware to verify only individual users can access
 */
export const individualOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authError = requireAuth(req);
  if (authError) return next(authError);

  const roleError = checkRole(
    req,
    ["ind", "g-ind"],
    "Access denied. Individual user account required.",
  );
  if (roleError) return next(roleError);

  next();
};

/**
 * Middleware to verify only organization users can access
 */
export const organizationOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authError = requireAuth(req);
  if (authError) return next(authError);

  const roleError = checkRole(
    req,
    ["org", "g-org"],
    "Access denied. Organization account required.",
  );
  if (roleError) return next(roleError);

  next();
};

/**
 * Middleware to verify only mediator users can access
 */
export const mediatorOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authError = requireAuth(req);
  if (authError) return next(authError);

  const roleError = checkRole(
    req,
    ["mediator"],
    "Access denied. Mediator account required.",
  );
  if (roleError) return next(roleError);

  next();
};

/**
 * Middleware to verify super admin only
 */
export const superAdminOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authError = requireAuth(req);
  if (authError) return next(authError);

  const roleError = checkRole(
    req,
    ["super-admin"],
    "Access denied. Super admin privileges required.",
  );
  if (roleError) return next(roleError);

  next();
};

/**
 * Middleware to verify user owns the resource (by ID)
 * @param idField - The field name in req.params that contains the resource ID (default: 'id')
 * @param resourceType - Optional resource type for better error messages
 */
export const resourceOwnerOnly = (
  idField: string = "id",
  resourceType?: string,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authError = requireAuth(req);
    if (authError) return next(authError);

    const resourceId = req.params[idField];

    if (!resourceId) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: `Resource ID (${idField}) is required.`,
      };
      return next(error);
    }

    // Check if user is super admin (super admins can access any resource)
    if (req.user?.role === "super-admin") {
      return next();
    }

    // Check if user owns the resource
    if (req.user?._id !== resourceId && req.user?.id !== resourceId) {
      const error: ErrorResponse = {
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

/**
 * Middleware to verify user can access the resource (owner or admin)
 * @param idField - The field name in req.params that contains the resource ID (default: 'id')
 * @param resourceType - Optional resource type for better error messages
 */
export const resourceAccess = (
  idField: string = "id",
  resourceType?: string,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authError = requireAuth(req);
    if (authError) return next(authError);

    const resourceId = req.params[idField];

    if (!resourceId) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: `Resource ID (${idField}) is required.`,
      };
      return next(error);
    }

    // Check if user is admin or super admin
    if (req.user?.role === "admin" || req.user?.role === "super-admin") {
      return next();
    }

    // Check if user owns the resource
    if (req.user?._id === resourceId || req.user?.id === resourceId) {
      return next();
    }

    const error: ErrorResponse = {
      statusCode: 403,
      status: "fail",
      message: resourceType
        ? `Access denied. You do not have permission to access this ${resourceType}.`
        : "Access denied. You do not have permission to access this resource.",
    };
    return next(error);
  };
};

/**
 * Combined middleware that checks both authentication and specific role
 * This is useful when you need both checks in a single middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return [verifyAuth, restrictTo(allowedRoles)];
};

// Export commonly used role arrays for convenience
export const ROLES = {
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
} as const;
