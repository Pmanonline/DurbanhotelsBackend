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
exports.getUserMenus = exports.deleteFeedback = exports.markAllAsRead = exports.markAsRead = exports.getOwnerMenuFeedback = exports.getMenuFeedback = exports.submitMenuFeedback = void 0;
const MenuFeedback_model_1 = __importDefault(require("./MenuFeedback.model"));
const MenuQR_model_1 = __importDefault(require("../MenuQRcode/MenuQR.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const activityLog_service_1 = require("../Activity_log/activityLog.service");
/**
 * Submit feedback for a menu (public)
 */
const submitMenuFeedback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { menu_id, type, rating, title, message, category } = req.body;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const rawIp = req.ip || req.headers["x-forwarded-for"] || ((_c = req.socket) === null || _c === void 0 ? void 0 : _c.remoteAddress);
        const userIp = Array.isArray(rawIp)
            ? rawIp[0]
            : (rawIp === null || rawIp === void 0 ? void 0 : rawIp.toString()) || undefined;
        if (!menu_id || !type || !message) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Menu ID, feedback type, and message are required",
            };
            return next(error);
        }
        const menu = yield MenuQR_model_1.default.findById(menu_id);
        if (!menu) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Menu not found",
            };
            return next(error);
        }
        // Rate limiting: max 5 feedbacks per IP per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayFeedbackCount = yield MenuFeedback_model_1.default.countDocuments({
            menu_id,
            user_ip: userIp,
            created_at: { $gte: today },
        });
        if (todayFeedbackCount >= 5) {
            const error = {
                statusCode: 429,
                status: "fail",
                message: "Too many feedback submissions today. Please try again tomorrow.",
            };
            return next(error);
        }
        if ((type === "review" || type === "rating") &&
            (!rating || rating < 1 || rating > 5)) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Rating is required for reviews (1-5 stars)",
            };
            return next(error);
        }
        const feedback = new MenuFeedback_model_1.default({
            menu_id,
            user_id: userId,
            user_ip: userIp,
            type,
            rating,
            title,
            message,
            category: category || "other",
            is_public: type === "review" || type === "rating",
        });
        yield feedback.save();
        yield (0, activityLog_service_1.createActivityLog)({
            user_id: menu.user_id,
            activity_type: "menu_feedback_received",
            title: "New Menu Feedback Received",
            description: `New ${type} for "${menu.title}"`,
            entity_type: "menu_feedback",
            entity_name: menu.title,
            status: "info",
            req,
        });
        res.status(201).json({
            status: "success",
            message: "Thank you for your feedback!",
            data: {
                feedback: {
                    id: feedback._id,
                    type: feedback.type,
                    created_at: feedback.created_at,
                },
            },
        });
    }
    catch (error) {
        console.error("❌ Error submitting feedback:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: error instanceof Error ? error.message : "Error submitting feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.submitMenuFeedback = submitMenuFeedback;
/**
 * Get public feedback for a menu
 */
const getMenuFeedback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { menu_id } = req.params;
        const { type, category, limit = "10", page = "1" } = req.query;
        if (!menu_id) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Menu ID is required",
            };
            return next(error);
        }
        const menu = yield MenuQR_model_1.default.findById(menu_id);
        if (!menu || !menu.is_public) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Menu not found or not publicly accessible",
            };
            return next(error);
        }
        const query = {
            menu_id,
            is_public: true,
            status: { $ne: "archived" },
        };
        if (type)
            query.type = type;
        if (category)
            query.category = category;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const feedback = yield MenuFeedback_model_1.default.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limitNum)
            .select("type rating title message category created_at")
            .lean();
        const total = yield MenuFeedback_model_1.default.countDocuments(query);
        const stats = yield MenuFeedback_model_1.default.aggregate([
            {
                $match: {
                    menu_id: new mongoose_1.default.Types.ObjectId(menu_id),
                    is_public: true,
                },
            },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    averageRating: {
                        $avg: { $cond: [{ $ne: ["$rating", null] }, "$rating", null] },
                    },
                },
            },
        ]);
        const averageRating = yield MenuFeedback_model_1.default.aggregate([
            {
                $match: {
                    menu_id: new mongoose_1.default.Types.ObjectId(menu_id),
                    rating: { $exists: true, $ne: null },
                },
            },
            { $group: { _id: null, average: { $avg: "$rating" } } },
        ]);
        res.status(200).json({
            status: "success",
            data: {
                feedback,
                stats: {
                    total,
                    average_rating: ((_b = (_a = averageRating[0]) === null || _a === void 0 ? void 0 : _a.average) === null || _b === void 0 ? void 0 : _b.toFixed(1)) || "0.0",
                    by_type: stats,
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching feedback:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getMenuFeedback = getMenuFeedback;
/**
 * Get feedback for menu owner (private)
 */
const getOwnerMenuFeedback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const { menu_id } = req.params;
        const { status, type, limit = "20", page = "1" } = req.query;
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        if (!menu_id) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Menu ID is required",
            };
            return next(error);
        }
        const menu = yield MenuQR_model_1.default.findOne({ _id: menu_id, user_id: userId });
        if (!menu) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "You don't have permission to view feedback for this menu",
            };
            return next(error);
        }
        const query = { menu_id };
        if (status)
            query.status = status;
        if (type)
            query.type = type;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const feedback = yield MenuFeedback_model_1.default.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limitNum)
            .select("-__v")
            .lean();
        const total = yield MenuFeedback_model_1.default.countDocuments(query);
        const unreadCount = yield MenuFeedback_model_1.default.countDocuments({
            menu_id,
            status: "pending",
        });
        res.status(200).json({
            status: "success",
            data: {
                feedback,
                menu_title: menu.title,
                stats: {
                    total,
                    unread_count: unreadCount,
                    by_status: yield MenuFeedback_model_1.default.aggregate([
                        { $match: { menu_id: new mongoose_1.default.Types.ObjectId(menu_id) } },
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                    ]),
                    by_type: yield MenuFeedback_model_1.default.aggregate([
                        { $match: { menu_id: new mongoose_1.default.Types.ObjectId(menu_id) } },
                        { $group: { _id: "$type", count: { $sum: 1 } } },
                    ]),
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching owner feedback:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getOwnerMenuFeedback = getOwnerMenuFeedback;
/**
 * Mark a single feedback as read (owner only)
 */
const markAsRead = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const { feedback_id } = req.params;
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const feedback = yield MenuFeedback_model_1.default.findById(feedback_id).populate({ path: "menu_id", select: "user_id title" });
        if (!feedback) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Feedback not found",
            };
            return next(error);
        }
        const menu = feedback.menu_id;
        if (!menu || menu.user_id.toString() !== userId.toString()) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "You don't have permission to update this feedback",
            };
            return next(error);
        }
        if (feedback.status === "pending") {
            feedback.status = "read";
            yield feedback.save();
        }
        res.status(200).json({
            status: "success",
            message: "Feedback marked as read",
        });
    }
    catch (error) {
        console.error("❌ Error marking feedback as read:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error updating feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.markAsRead = markAsRead;
/**
 * Mark all pending feedback as read for a menu (owner only)
 */
const markAllAsRead = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const { menu_id } = req.params;
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const menu = yield MenuQR_model_1.default.findOne({ _id: menu_id, user_id: userId });
        if (!menu) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "You don't have permission to update feedback for this menu",
            };
            return next(error);
        }
        const result = yield MenuFeedback_model_1.default.updateMany({ menu_id, status: "pending" }, { $set: { status: "read" } });
        res.status(200).json({
            status: "success",
            message: `${result.modifiedCount} feedback item(s) marked as read`,
            data: { updated_count: result.modifiedCount },
        });
    }
    catch (error) {
        console.error("❌ Error marking all feedback as read:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error updating feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.markAllAsRead = markAllAsRead;
/**
 * Delete feedback permanently (owner only)
 */
const deleteFeedback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const { feedback_id } = req.params;
        if (!userId) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        const feedback = yield MenuFeedback_model_1.default.findById(feedback_id).populate({ path: "menu_id", select: "user_id title" });
        if (!feedback) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "Feedback not found",
            };
            return next(error);
        }
        const menu = feedback.menu_id;
        if (!menu || menu.user_id.toString() !== userId.toString()) {
            const error = {
                statusCode: 403,
                status: "fail",
                message: "You don't have permission to delete this feedback",
            };
            return next(error);
        }
        yield MenuFeedback_model_1.default.findByIdAndDelete(feedback_id);
        yield (0, activityLog_service_1.createActivityLog)({
            user_id: userId,
            activity_type: "feedback_deleted",
            title: "Feedback Deleted",
            description: `Deleted feedback for "${menu.title}"`,
            entity_type: "menu_feedback",
            status: "success",
            req,
        });
        res.status(200).json({
            status: "success",
            message: "Feedback deleted successfully",
        });
    }
    catch (error) {
        console.error("❌ Error deleting feedback:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error deleting feedback",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.deleteFeedback = deleteFeedback;
/**
 * Get all menus belonging to the authenticated user
 */
const getUserMenus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const menus = yield MenuQR_model_1.default.find({ user_id: userId })
            .select("_id title description is_public created_at")
            .sort({ created_at: -1 })
            .lean();
        res.status(200).json({
            status: "success",
            data: menus,
        });
    }
    catch (error) {
        console.error("❌ Error fetching user menus:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching menus",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getUserMenus = getUserMenus;
