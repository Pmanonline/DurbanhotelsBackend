import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import {
  getUserActivityLogs,
  getEntityActivityLogs,
  getUserActivityStats,
  formatActivityLog,
  ActivityType,
  ActivityStatus,
  EntityType,
} from "./activityLog.service";

// Type guards to validate string inputs
const isValidActivityType = (value: any): value is ActivityType => {
  const validTypes: ActivityType[] = [
    "menu_created",
    "menu_updated",
    "menu_deleted",
    "qr_scanned",
    "analytics_downloaded",
    "menu_feedback_received",
    "feedback_responded",
    "feedback_archived",
    "feedback_updated",
    "team_invitation",
    "team_member_added",
    "team_member_removed",
    "settings_changed",
    "profile_updated",
    "password_changed",
    "qr_code_created",
    "qr_code_updated",
    "qr_code_deleted",
    "presentation_created",
    "presentation_updated",
    "presentation_deleted",
    "login",
    "logout",
    "registration",
    "password_reset",
    "email_verified",
    "api_key_created",
    "api_key_revoked",
  ];
  return validTypes.includes(value);
};

const isValidActivityStatus = (value: any): value is ActivityStatus => {
  const validStatuses: ActivityStatus[] = [
    "success",
    "pending",
    "failed",
    "info",
    "warning",
  ];
  return validStatuses.includes(value);
};

const isValidEntityType = (value: any): value is EntityType => {
  const validEntityTypes: EntityType[] = [
    "menu",
    "qr_code",
    "analytics",
    "team",
    "settings",
    "menu_feedback",
    "presentation",
    "user",
    "api_key",
    "system",
  ];
  return validEntityTypes.includes(value);
};

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

    // Validate and cast activity_type
    const activityTypeParam = req.query.activity_type as string | undefined;
    const activity_type =
      activityTypeParam && isValidActivityType(activityTypeParam)
        ? activityTypeParam
        : undefined;

    // Validate and cast status
    const statusParam = req.query.status as string | undefined;
    const status =
      statusParam && isValidActivityStatus(statusParam)
        ? statusParam
        : undefined;

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

    // Validate entity type
    if (!isValidEntityType(entityType)) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: `Invalid entity type. Must be one of: menu, qr_code, analytics, team, settings, menu_feedback, presentation, user, api_key, system`,
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
