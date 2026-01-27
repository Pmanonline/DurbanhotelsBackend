import ActivityLog, { ActivityLogDocument } from "./ActivityLog.model";
import { Request } from "express";
import mongoose from "mongoose";

/**
 * Activity Log Service
 * Centralized service for creating and managing activity logs
 */

interface CreateActivityLogParams {
  user_id: mongoose.Types.ObjectId | string;
  activity_type:
    | "menu_created"
    | "menu_updated"
    | "menu_deleted"
    | "qr_scanned"
    | "analytics_downloaded"
    | "team_invitation"
    | "settings_changed";
  title: string;
  description: string;
  entity_type?: "menu" | "qr_code" | "team" | "analytics" | "settings";
  entity_id?: mongoose.Types.ObjectId | string;
  entity_name?: string;
  status?: "success" | "pending" | "failed" | "info";
  metadata?: Record<string, any>;
  req?: Request; // For extracting IP and User-Agent
}

/**
 * Create a new activity log entry
 */
export const createActivityLog = async (
  params: CreateActivityLogParams,
): Promise<ActivityLogDocument | null> => {
  try {
    const {
      user_id,
      activity_type,
      title,
      description,
      entity_type,
      entity_id,
      entity_name,
      status = "success",
      metadata = {},
      req,
    } = params;

    // Extract IP and User-Agent from request if provided
    const ip_address = req?.ip || req?.headers["x-forwarded-for"] || undefined;
    const user_agent = req?.headers["user-agent"] || undefined;

    const activityLog = new ActivityLog({
      user_id,
      activity_type,
      title,
      description,
      entity_type,
      entity_id,
      entity_name,
      status,
      metadata,
      ip_address: typeof ip_address === "string" ? ip_address : undefined,
      user_agent,
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error("❌ Failed to create activity log:", error);
    return null;
  }
};

/**
 * Get user activity logs with pagination
 */
export const getUserActivityLogs = async (
  user_id: mongoose.Types.ObjectId | string,
  options: {
    page?: number;
    limit?: number;
    activity_type?: string;
    status?: string;
  } = {},
): Promise<{
  logs: ActivityLogDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { user_id };

    if (options.activity_type) {
      query.activity_type = options.activity_type;
    }

    if (options.status) {
      query.status = options.status;
    }

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ActivityLog.countDocuments(query);

    return {
      logs: logs as ActivityLogDocument[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Failed to fetch activity logs:", error);
    return {
      logs: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    };
  }
};

/**
 * Get recent activity for a specific entity
 */
export const getEntityActivityLogs = async (
  entity_id: mongoose.Types.ObjectId | string,
  entity_type: string,
  limit: number = 10,
): Promise<ActivityLogDocument[]> => {
  try {
    const logs = await ActivityLog.find({ entity_id, entity_type })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs as ActivityLogDocument[];
  } catch (error) {
    console.error("❌ Failed to fetch entity activity logs:", error);
    return [];
  }
};

/**
 * Delete old activity logs (cleanup utility)
 */
export const deleteOldActivityLogs = async (
  daysOld: number = 90,
): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(
      `🗑️ Deleted ${result.deletedCount} activity logs older than ${daysOld} days`,
    );
    return result.deletedCount;
  } catch (error) {
    console.error("❌ Failed to delete old activity logs:", error);
    return 0;
  }
};

/**
 * Get activity statistics for a user
 */
export const getUserActivityStats = async (
  user_id: mongoose.Types.ObjectId | string,
  days: number = 30,
): Promise<{
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  recent_activities: ActivityLogDocument[];
}> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await ActivityLog.find({
      user_id,
      createdAt: { $gte: startDate },
    }).lean();

    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};

    logs.forEach((log: any) => {
      by_type[log.activity_type] = (by_type[log.activity_type] || 0) + 1;
      by_status[log.status] = (by_status[log.status] || 0) + 1;
    });

    const recent = await ActivityLog.find({ user_id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      total: logs.length,
      by_type,
      by_status,
      recent_activities: recent as ActivityLogDocument[],
    };
  } catch (error) {
    console.error("❌ Failed to get activity stats:", error);
    return {
      total: 0,
      by_type: {},
      by_status: {},
      recent_activities: [],
    };
  }
};

// Helper function to format activity log for frontend
export const formatActivityLog = (log: ActivityLogDocument) => {
  return {
    id: log._id,
    type: log.activity_type,
    title: log.title,
    description: log.description,
    status: log.status,
    entity: {
      type: log.entity_type,
      id: log.entity_id,
      name: log.entity_name,
    },
    timestamp: log.createdAt,
    metadata: log.metadata,
  };
};
