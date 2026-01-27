import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import {
  getUserActivityLogs,
  getEntityActivityLogs,
  getUserActivityStats,
  formatActivityLog,
} from "./activityLog.service";

/**
 * Get user activity logs with pagination and filters
 * GET /api/activity-logs
 */
export const getActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const activity_type = req.query.activity_type as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await getUserActivityLogs(userId, {
      page,
      limit,
      activity_type,
      status,
    });

    // Format logs for frontend
    const formattedLogs = result.logs.map(formatActivityLog);

    res.status(200).json({
      status: "success",
      results: formattedLogs.length,
      data: {
        activities: formattedLogs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching activity logs:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching activity logs",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get recent activities for dashboard
 * GET /api/activity-logs/recent
 */
export const getRecentActivities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const limit = parseInt(req.query.limit as string) || 5;

    const result = await getUserActivityLogs(userId, { page: 1, limit });

    const formattedLogs = result.logs.map(formatActivityLog);

    res.status(200).json({
      status: "success",
      data: {
        activities: formattedLogs,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching recent activities:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching recent activities",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get activity statistics for user
 * GET /api/activity-logs/stats
 */
export const getActivityStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const days = parseInt(req.query.days as string) || 30;

    const stats = await getUserActivityStats(userId, days);

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching activity stats:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching activity statistics",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get activity logs for a specific entity (menu, QR code, etc.)
 * GET /api/activity-logs/entity/:entityType/:entityId
 */
export const getEntityActivities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!entityType || !entityId) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Entity type and ID are required",
      };
      return next(error);
    }

    const logs = await getEntityActivityLogs(entityId, entityType, limit);

    const formattedLogs = logs.map(formatActivityLog);

    res.status(200).json({
      status: "success",
      results: formattedLogs.length,
      data: {
        activities: formattedLogs,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching entity activities:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching entity activities",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
