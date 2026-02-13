"use strict";
// import ActivityLog, { ActivityLogDocument } from "./ActivityLog.model";
// import { Request } from "express";
// import mongoose from "mongoose";
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
exports.searchActivityLogs = exports.createBatchActivityLogs = exports.formatActivityLog = exports.getUserActivityStats = exports.deleteOldActivityLogs = exports.getEntityActivityLogs = exports.getUserActivityLogs = exports.createActivityLog = void 0;
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
const ActivityLog_model_1 = __importDefault(require("./ActivityLog.model"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Create a new activity log entry
 */
const createActivityLog = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { user_id, activity_type, title, description, entity_type, entity_id, entity_name, status = "success", metadata = {}, req, } = params;
        // Extract IP and User-Agent from request if provided
        const ip_address = (req === null || req === void 0 ? void 0 : req.ip) ||
            (req === null || req === void 0 ? void 0 : req.headers["x-forwarded-for"]) ||
            ((_a = req === null || req === void 0 ? void 0 : req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) ||
            undefined;
        const user_agent = (req === null || req === void 0 ? void 0 : req.headers["user-agent"]) || undefined;
        // Handle IP address if it's an array
        const finalIpAddress = Array.isArray(ip_address)
            ? ip_address[0]
            : ip_address;
        const activityLog = new ActivityLog_model_1.default({
            user_id: typeof user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(user_id)
                : user_id,
            activity_type,
            title,
            description,
            entity_type,
            entity_id: entity_id
                ? typeof entity_id === "string"
                    ? new mongoose_1.default.Types.ObjectId(entity_id)
                    : entity_id
                : undefined,
            entity_name,
            status,
            metadata,
            ip_address: finalIpAddress,
            user_agent,
        });
        yield activityLog.save();
        console.log(`📝 Activity logged: ${activity_type} - ${title}`);
        return activityLog;
    }
    catch (error) {
        console.error("❌ Failed to create activity log:", error);
        return null;
    }
});
exports.createActivityLog = createActivityLog;
/**
 * Get user activity logs with pagination
 */
const getUserActivityLogs = (user_id_1, ...args_1) => __awaiter(void 0, [user_id_1, ...args_1], void 0, function* (user_id, options = {}) {
    var _a, _b;
    try {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {
            user_id: typeof user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(user_id)
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
            if (options.startDate)
                query.createdAt.$gte = options.startDate;
            if (options.endDate)
                query.createdAt.$lte = options.endDate;
        }
        const [logs, total] = yield Promise.all([
            ActivityLog_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog_model_1.default.countDocuments(query),
        ]);
        // Get summary statistics
        const summary = yield ActivityLog_model_1.default.aggregate([
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
        const by_type = (((_a = summary[0]) === null || _a === void 0 ? void 0 : _a.by_type) || []).reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        const by_status = (((_b = summary[0]) === null || _b === void 0 ? void 0 : _b.by_status) || []).reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        return {
            logs: logs,
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
    }
    catch (error) {
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
});
exports.getUserActivityLogs = getUserActivityLogs;
/**
 * Get recent activity for a specific entity
 */
const getEntityActivityLogs = (entity_id_1, entity_type_1, ...args_1) => __awaiter(void 0, [entity_id_1, entity_type_1, ...args_1], void 0, function* (entity_id, entity_type, limit = 10) {
    try {
        const logs = yield ActivityLog_model_1.default.find({
            entity_id: typeof entity_id === "string"
                ? new mongoose_1.default.Types.ObjectId(entity_id)
                : entity_id,
            entity_type,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return logs;
    }
    catch (error) {
        console.error("❌ Failed to fetch entity activity logs:", error);
        return [];
    }
});
exports.getEntityActivityLogs = getEntityActivityLogs;
/**
 * Delete old activity logs (cleanup utility)
 */
const deleteOldActivityLogs = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (daysOld = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const result = yield ActivityLog_model_1.default.deleteMany({
            createdAt: { $lt: cutoffDate },
        });
        console.log(`🗑️ Deleted ${result.deletedCount} activity logs older than ${daysOld} days`);
        return result.deletedCount || 0;
    }
    catch (error) {
        console.error("❌ Failed to delete old activity logs:", error);
        return 0;
    }
});
exports.deleteOldActivityLogs = deleteOldActivityLogs;
/**
 * Get activity statistics for a user
 */
const getUserActivityStats = (user_id_1, ...args_1) => __awaiter(void 0, [user_id_1, ...args_1], void 0, function* (user_id, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const query = {
            user_id: typeof user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(user_id)
                : user_id,
            createdAt: { $gte: startDate },
        };
        const [logs, timelineData] = yield Promise.all([
            ActivityLog_model_1.default.find(query).lean(),
            ActivityLog_model_1.default.aggregate([
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
        const by_type = {};
        const by_status = {};
        logs.forEach((log) => {
            by_type[log.activity_type] = (by_type[log.activity_type] || 0) + 1;
            by_status[log.status] = (by_status[log.status] || 0) + 1;
        });
        const recent = yield ActivityLog_model_1.default.find({
            user_id: typeof user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(user_id)
                : user_id,
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        const timeline = timelineData.map((item) => ({
            date: item._id,
            count: item.count,
        }));
        return {
            total: logs.length,
            by_type,
            by_status,
            recent_activities: recent,
            timeline,
        };
    }
    catch (error) {
        console.error("❌ Failed to get activity stats:", error);
        return {
            total: 0,
            by_type: {},
            by_status: {},
            recent_activities: [],
            timeline: [],
        };
    }
});
exports.getUserActivityStats = getUserActivityStats;
/**
 * Helper function to format activity log for frontend
 */
const formatActivityLog = (log) => {
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
exports.formatActivityLog = formatActivityLog;
/**
 * Log multiple activities in batch (for bulk operations)
 */
const createBatchActivityLogs = (logs) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activityLogs = logs.map((log) => ({
            user_id: typeof log.user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(log.user_id)
                : log.user_id,
            activity_type: log.activity_type,
            title: log.title,
            description: log.description,
            entity_type: log.entity_type,
            entity_id: log.entity_id
                ? typeof log.entity_id === "string"
                    ? new mongoose_1.default.Types.ObjectId(log.entity_id)
                    : log.entity_id
                : undefined,
            entity_name: log.entity_name,
            status: log.status || "success",
            metadata: log.metadata || {},
            ip_address: undefined,
            user_agent: undefined,
        }));
        const result = yield ActivityLog_model_1.default.insertMany(activityLogs);
        console.log(`📝 Batch logged ${result.length} activities`);
        return result.length;
    }
    catch (error) {
        console.error("❌ Failed to create batch activity logs:", error);
        return 0;
    }
});
exports.createBatchActivityLogs = createBatchActivityLogs;
/**
 * Search activity logs
 */
const searchActivityLogs = (user_id_1, searchTerm_1, ...args_1) => __awaiter(void 0, [user_id_1, searchTerm_1, ...args_1], void 0, function* (user_id, searchTerm, options = {}) {
    try {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const query = {
            user_id: typeof user_id === "string"
                ? new mongoose_1.default.Types.ObjectId(user_id)
                : user_id,
            $or: [
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { entity_name: { $regex: searchTerm, $options: "i" } },
            ],
        };
        const [logs, total] = yield Promise.all([
            ActivityLog_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog_model_1.default.countDocuments(query),
        ]);
        return {
            logs: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
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
});
exports.searchActivityLogs = searchActivityLogs;
