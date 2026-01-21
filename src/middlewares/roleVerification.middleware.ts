import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../utilities/errorHandler.util";
import jwt from "jsonwebtoken";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        sessionId?: string;
      };
    }
  }
}

/**
 * Middleware to verify user is authenticated and has valid tokens
 */
export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
      role: string;
      sessionId?: string;
    };

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message:
        error instanceof jwt.TokenExpiredError
          ? "Token expired. Please log in again."
          : "Invalid authentication token.",
    };
    next(errResponse);
  }
};

/**
 * Middleware factory to restrict access to specific roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 *
 */
export const restrictTo = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Authentication required.",
      };
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: `Access denied. This action is restricted to: ${allowedRoles.join(
          ", "
        )} users only.`,
      };
      return next(error);
    }

    next();
  };
};

/**
 * Middleware to verify only admin users can access
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    const error: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message: "Authentication required.",
    };
    return next(error);
  }

  if (req.user.role !== "admin" && req.user.role !== "super-admin") {
    const error: ErrorResponse = {
      statusCode: 403,
      status: "fail",
      message: "Access denied. Admin privileges required.",
    };
    return next(error);
  }

  next();
};

/**
 * Middleware to verify only individual users can access
 */
export const individualOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    const error: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message: "Authentication required.",
    };
    return next(error);
  }

  if (req.user.role !== "ind" && req.user.role !== "g-ind") {
    const error: ErrorResponse = {
      statusCode: 403,
      status: "fail",
      message: "Access denied. Individual user account required.",
    };
    return next(error);
  }

  next();
};

/**
 * Middleware to verify only organization users can access
 */
export const organizationOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    const error: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message: "Authentication required.",
    };
    return next(error);
  }

  if (req.user.role !== "org" && req.user.role !== "g-org") {
    const error: ErrorResponse = {
      statusCode: 403,
      status: "fail",
      message: "Access denied. Organization account required.",
    };
    return next(error);
  }

  next();
};

/**
 * Middleware to verify only mediator users can access
 */
export const mediatorOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    const error: ErrorResponse = {
      statusCode: 401,
      status: "fail",
      message: "Authentication required.",
    };
    return next(error);
  }

  if (req.user.role !== "mediator") {
    const error: ErrorResponse = {
      statusCode: 403,
      status: "fail",
      message: "Access denied. Mediator account required.",
    };
    return next(error);
  }

  next();
};

/**
 * Middleware to verify super admin only
 */
export const superAdminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "Authentication required.",
      };
      return next(error);
    }

    if (req.user.role !== "super-admin") {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Access denied. Super admin privileges required.",
      };
      return next(error);
    }

    next();
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error verifying super admin status",
    };
    next(errResponse);
  }
};
