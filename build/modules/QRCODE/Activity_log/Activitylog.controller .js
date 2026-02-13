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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntityActivities = exports.getActivityStats = exports.getRecentActivities = exports.getActivityLogs = void 0;
const activityLog_service_1 = require("./activityLog.service");
// Type guards to validate string inputs
const isValidActivityType = (value) => {
    const validTypes = [
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
const isValidActivityStatus = (value) => {
    const validStatuses = [
        "success",
        "pending",
        "failed",
        "info",
        "warning",
    ];
    return validStatuses.includes(value);
};
const isValidEntityType = (value) => {
    const validEntityTypes = [
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
const getActivityLogs = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        // Validate and cast activity_type
        const activityTypeParam = req.query.activity_type;
        const activity_type = activityTypeParam && isValidActivityType(activityTypeParam)
            ? activityTypeParam
            : undefined;
        // Validate and cast status
        const statusParam = req.query.status;
        const status = statusParam && isValidActivityStatus(statusParam)
            ? statusParam
            : undefined;
        const result = yield (0, activityLog_service_1.getUserActivityLogs)(userId, {
            page,
            limit,
            activity_type,
            status,
        });
        // Format logs for frontend
        const formattedLogs = result.logs.map(activityLog_service_1.formatActivityLog);
        res.status(200).json({
            status: "success",
            results: formattedLogs.length,
            data: {
                activities: formattedLogs,
                pagination: result.pagination,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching activity logs:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching activity logs",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getActivityLogs = getActivityLogs;
/**
 * Get recent activities for dashboard
 * GET /api/activity-logs/recent
 */
const getRecentActivities = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const limit = parseInt(req.query.limit) || 5;
        const result = yield (0, activityLog_service_1.getUserActivityLogs)(userId, { page: 1, limit });
        const formattedLogs = result.logs.map(activityLog_service_1.formatActivityLog);
        res.status(200).json({
            status: "success",
            data: {
                activities: formattedLogs,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching recent activities:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching recent activities",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getRecentActivities = getRecentActivities;
/**
 * Get activity statistics for user
 * GET /api/activity-logs/stats
 */
const getActivityStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const days = parseInt(req.query.days) || 30;
        const stats = yield (0, activityLog_service_1.getUserActivityStats)(userId, days);
        res.status(200).json({
            status: "success",
            data: {
                stats,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching activity stats:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching activity statistics",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getActivityStats = getActivityStats;
/**
 * Get activity logs for a specific entity (menu, QR code, etc.)
 * GET /api/activity-logs/entity/:entityType/:entityId
 */
const getEntityActivities = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const { entityType, entityId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        if (!entityType || !entityId) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Entity type and ID are required",
            };
            return next(error);
        }
        // Validate entity type
        if (!isValidEntityType(entityType)) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: `Invalid entity type. Must be one of: menu, qr_code, analytics, team, settings, menu_feedback, presentation, user, api_key, system`,
            };
            return next(error);
        }
        const logs = yield (0, activityLog_service_1.getEntityActivityLogs)(entityId, entityType, limit);
        const formattedLogs = logs.map(activityLog_service_1.formatActivityLog);
        res.status(200).json({
            status: "success",
            results: formattedLogs.length,
            data: {
                activities: formattedLogs,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching entity activities:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching entity activities",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getEntityActivities = getEntityActivities;
