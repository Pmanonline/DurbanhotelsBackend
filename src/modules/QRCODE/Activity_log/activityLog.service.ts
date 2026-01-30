// import ActivityLog, { ActivityLogDocument } from "./ActivityLog.model";
// import { Request } from "express";
// import mongoose from "mongoose";

// /**
//  * Activity Log Service
//  * Centralized service for creating and managing activity logs
//  */

// interface CreateActivityLogParams {
//   user_id: mongoose.Types.ObjectId | string;
//   activity_type:
//     | "menu_created"
//     | "menu_updated"
//     | "menu_deleted"
//     | "qr_scanned"
//     | "analytics_downloaded"
//     | "team_invitation"
//     | "settings_changed"
//     | "menu_feedback_received"
//     | "feedback_responded"
//     | "feedback_archived"
//     | "feedback_updated";
//   title: string;
//   description: string;
//   entity_type?:
//     | "menu"
//     | "qr_code"
//     | "analytics"
//     | "team"
//     | "settings"
//     | "menu_feedback";
//   entity_id?: mongoose.Types.ObjectId | string;
//   entity_name?: string;
//   status?: "success" | "pending" | "failed" | "info";
//   metadata?: Record<string, any>;
//   req?: Request; // For extracting IP and User-Agent
// }

// /**
//  * Create a new activity log entry
//  */
// export const createActivityLog = async (
//   params: CreateActivityLogParams,
// ): Promise<ActivityLogDocument | null> => {
//   try {
//     const {
//       user_id,
//       activity_type,
//       title,
//       description,
//       entity_type,
//       entity_id,
//       entity_name,
//       status = "success",
//       metadata = {},
//       req,
//     } = params;

//     // Extract IP and User-Agent from request if provided
//     const ip_address = req?.ip || req?.headers["x-forwarded-for"] || undefined;
//     const user_agent = req?.headers["user-agent"] || undefined;

//     const activityLog = new ActivityLog({
//       user_id,
//       activity_type,
//       title,
//       description,
//       entity_type,
//       entity_id,
//       entity_name,
//       status,
//       metadata,
//       ip_address: typeof ip_address === "string" ? ip_address : undefined,
//       user_agent,
//     });

//     await activityLog.save();
//     return activityLog;
//   } catch (error) {
//     console.error("❌ Failed to create activity log:", error);
//     return null;
//   }
// };

// /**
//  * Get user activity logs with pagination
//  */
// export const getUserActivityLogs = async (
//   user_id: mongoose.Types.ObjectId | string,
//   options: {
//     page?: number;
//     limit?: number;
//     activity_type?: string;
//     status?: string;
//   } = {},
// ): Promise<{
//   logs: ActivityLogDocument[];
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//     pages: number;
//   };
// }> => {
//   try {
//     const page = options.page || 1;
//     const limit = options.limit || 20;
//     const skip = (page - 1) * limit;

//     const query: any = { user_id };

//     if (options.activity_type) {
//       query.activity_type = options.activity_type;
//     }

//     if (options.status) {
//       query.status = options.status;
//     }

//     const logs = await ActivityLog.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const total = await ActivityLog.countDocuments(query);

//     return {
//       logs: logs as ActivityLogDocument[],
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     };
//   } catch (error) {
//     console.error("❌ Failed to fetch activity logs:", error);
//     return {
//       logs: [],
//       pagination: {
//         page: 1,
//         limit: 20,
//         total: 0,
//         pages: 0,
//       },
//     };
//   }
// };

// /**
//  * Get recent activity for a specific entity
//  */
// export const getEntityActivityLogs = async (
//   entity_id: mongoose.Types.ObjectId | string,
//   entity_type: string,
//   limit: number = 10,
// ): Promise<ActivityLogDocument[]> => {
//   try {
//     const logs = await ActivityLog.find({ entity_id, entity_type })
//       .sort({ createdAt: -1 })
//       .limit(limit)
//       .lean();

//     return logs as ActivityLogDocument[];
//   } catch (error) {
//     console.error("❌ Failed to fetch entity activity logs:", error);
//     return [];
//   }
// };

// /**
//  * Delete old activity logs (cleanup utility)
//  */
// export const deleteOldActivityLogs = async (
//   daysOld: number = 90,
// ): Promise<number> => {
//   try {
//     const cutoffDate = new Date();
//     cutoffDate.setDate(cutoffDate.getDate() - daysOld);

//     const result = await ActivityLog.deleteMany({
//       createdAt: { $lt: cutoffDate },
//     });

//     console.log(
//       `🗑️ Deleted ${result.deletedCount} activity logs older than ${daysOld} days`,
//     );
//     return result.deletedCount;
//   } catch (error) {
//     console.error("❌ Failed to delete old activity logs:", error);
//     return 0;
//   }
// };

// /**
//  * Get activity statistics for a user
//  */
// export const getUserActivityStats = async (
//   user_id: mongoose.Types.ObjectId | string,
//   days: number = 30,
// ): Promise<{
//   total: number;
//   by_type: Record<string, number>;
//   by_status: Record<string, number>;
//   recent_activities: ActivityLogDocument[];
// }> => {
//   try {
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);

//     const logs = await ActivityLog.find({
//       user_id,
//       createdAt: { $gte: startDate },
//     }).lean();

//     const by_type: Record<string, number> = {};
//     const by_status: Record<string, number> = {};

//     logs.forEach((log: any) => {
//       by_type[log.activity_type] = (by_type[log.activity_type] || 0) + 1;
//       by_status[log.status] = (by_status[log.status] || 0) + 1;
//     });

//     const recent = await ActivityLog.find({ user_id })
//       .sort({ createdAt: -1 })
//       .limit(5)
//       .lean();

//     return {
//       total: logs.length,
//       by_type,
//       by_status,
//       recent_activities: recent as ActivityLogDocument[],
//     };
//   } catch (error) {
//     console.error("❌ Failed to get activity stats:", error);
//     return {
//       total: 0,
//       by_type: {},
//       by_status: {},
//       recent_activities: [],
//     };
//   }
// };

// // Helper function to format activity log for frontend
// export const formatActivityLog = (log: ActivityLogDocument) => {
//   return {
//     id: log._id,
//     type: log.activity_type,
//     title: log.title,
//     description: log.description,
//     status: log.status,
//     entity: {
//       type: log.entity_type,
//       id: log.entity_id,
//       name: log.entity_name,
//     },
//     timestamp: log.createdAt,
//     metadata: log.metadata,
//   };
// };

import ActivityLog, { ActivityLogDocument } from "./ActivityLog.model";
import { Request } from "express";
import mongoose from "mongoose";

/**
 * Activity Log Service
 * Centralized service for creating and managing activity logs
 */

// Define all activity types
type ActivityType =
  // Menu QR activities
  | "menu_created"
  | "menu_updated"
  | "menu_deleted"
  | "qr_scanned"
  | "analytics_downloaded"

  // Menu Feedback activities
  | "menu_feedback_received"
  | "feedback_responded"
  | "feedback_archived"
  | "feedback_updated"

  // Team activities
  | "team_invitation"
  | "team_member_added"
  | "team_member_removed"

  // Settings activities
  | "settings_changed"
  | "profile_updated"
  | "password_changed"

  // QR Code activities
  | "qr_code_created"
  | "qr_code_updated"
  | "qr_code_deleted"

  // Presentation activities
  | "presentation_created"
  | "presentation_updated"
  | "presentation_deleted"

  // System activities
  | "login"
  | "logout"
  | "registration"
  | "password_reset"
  | "email_verified"
  | "api_key_created"
  | "api_key_revoked";

// Define all entity types
type EntityType =
  | "menu"
  | "qr_code"
  | "analytics"
  | "team"
  | "settings"
  | "menu_feedback"
  | "presentation"
  | "user"
  | "api_key"
  | "system";

// Define status types
type ActivityStatus = "success" | "pending" | "failed" | "info" | "warning";

interface CreateActivityLogParams {
  user_id: mongoose.Types.ObjectId | string;
  activity_type: ActivityType;
  title: string;
  description: string;
  entity_type?: EntityType;
  entity_id?: mongoose.Types.ObjectId | string;
  entity_name?: string;
  status?: ActivityStatus;
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
    const ip_address =
      req?.ip ||
      req?.headers["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      undefined;
    const user_agent = req?.headers["user-agent"] || undefined;

    // Handle IP address if it's an array
    const finalIpAddress = Array.isArray(ip_address)
      ? ip_address[0]
      : ip_address;

    const activityLog = new ActivityLog({
      user_id:
        typeof user_id === "string"
          ? new mongoose.Types.ObjectId(user_id)
          : user_id,
      activity_type,
      title,
      description,
      entity_type,
      entity_id: entity_id
        ? typeof entity_id === "string"
          ? new mongoose.Types.ObjectId(entity_id)
          : entity_id
        : undefined,
      entity_name,
      status,
      metadata,
      ip_address: finalIpAddress,
      user_agent,
    });

    await activityLog.save();
    console.log(`📝 Activity logged: ${activity_type} - ${title}`);
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
    activity_type?: ActivityType;
    status?: ActivityStatus;
    entity_type?: EntityType;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<{
  logs: ActivityLogDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  };
}> => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      user_id:
        typeof user_id === "string"
          ? new mongoose.Types.ObjectId(user_id)
          : user_id,
    };

    if (options.activity_type) {
      query.activity_type = options.activity_type;
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.entity_type) {
      query.entity_type = options.entity_type;
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    // Get summary statistics
    const summary = await ActivityLog.aggregate([
      { $match: query },
      {
        $facet: {
          by_type: [
            { $group: { _id: "$activity_type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          by_status: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]);

    const by_type = (summary[0]?.by_type || []).reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    const by_status = (summary[0]?.by_status || []).reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    return {
      logs: logs as ActivityLogDocument[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        by_type,
        by_status,
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
      summary: {
        total: 0,
        by_type: {},
        by_status: {},
      },
    };
  }
};

/**
 * Get recent activity for a specific entity
 */
export const getEntityActivityLogs = async (
  entity_id: mongoose.Types.ObjectId | string,
  entity_type: EntityType,
  limit: number = 10,
): Promise<ActivityLogDocument[]> => {
  try {
    const logs = await ActivityLog.find({
      entity_id:
        typeof entity_id === "string"
          ? new mongoose.Types.ObjectId(entity_id)
          : entity_id,
      entity_type,
    })
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
    return result.deletedCount || 0;
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
  timeline: Array<{ date: string; count: number }>;
}> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = {
      user_id:
        typeof user_id === "string"
          ? new mongoose.Types.ObjectId(user_id)
          : user_id,
      createdAt: { $gte: startDate },
    };

    const [logs, timelineData] = await Promise.all([
      ActivityLog.find(query).lean(),
      ActivityLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};

    logs.forEach((log: any) => {
      by_type[log.activity_type] = (by_type[log.activity_type] || 0) + 1;
      by_status[log.status] = (by_status[log.status] || 0) + 1;
    });

    const recent = await ActivityLog.find({
      user_id:
        typeof user_id === "string"
          ? new mongoose.Types.ObjectId(user_id)
          : user_id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const timeline = timelineData.map((item: any) => ({
      date: item._id,
      count: item.count,
    }));

    return {
      total: logs.length,
      by_type,
      by_status,
      recent_activities: recent as ActivityLogDocument[],
      timeline,
    };
  } catch (error) {
    console.error("❌ Failed to get activity stats:", error);
    return {
      total: 0,
      by_type: {},
      by_status: {},
      recent_activities: [],
      timeline: [],
    };
  }
};

/**
 * Helper function to format activity log for frontend
 */
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
    ip_address: log.ip_address,
    user_agent: log.user_agent,
  };
};

/**
 * Log multiple activities in batch (for bulk operations)
 */
export const createBatchActivityLogs = async (
  logs: Omit<CreateActivityLogParams, "req">[],
): Promise<number> => {
  try {
    const activityLogs = logs.map((log) => ({
      user_id:
        typeof log.user_id === "string"
          ? new mongoose.Types.ObjectId(log.user_id)
          : log.user_id,
      activity_type: log.activity_type,
      title: log.title,
      description: log.description,
      entity_type: log.entity_type,
      entity_id: log.entity_id
        ? typeof log.entity_id === "string"
          ? new mongoose.Types.ObjectId(log.entity_id)
          : log.entity_id
        : undefined,
      entity_name: log.entity_name,
      status: log.status || "success",
      metadata: log.metadata || {},
      ip_address: undefined,
      user_agent: undefined,
    }));

    const result = await ActivityLog.insertMany(activityLogs);
    console.log(`📝 Batch logged ${result.length} activities`);
    return result.length;
  } catch (error) {
    console.error("❌ Failed to create batch activity logs:", error);
    return 0;
  }
};

/**
 * Search activity logs
 */
export const searchActivityLogs = async (
  user_id: mongoose.Types.ObjectId | string,
  searchTerm: string,
  options: {
    page?: number;
    limit?: number;
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

    const query = {
      user_id:
        typeof user_id === "string"
          ? new mongoose.Types.ObjectId(user_id)
          : user_id,
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { entity_name: { $regex: searchTerm, $options: "i" } },
      ],
    };

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

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
    console.error("❌ Failed to search activity logs:", error);
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

// Export types for use in other files
export type { CreateActivityLogParams };
export { ActivityType, EntityType, ActivityStatus };
