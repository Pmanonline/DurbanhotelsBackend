import { Request, Response, NextFunction } from "express";
import MenuFeedback from "./MenuFeedback.model";
import MenuQR from "../MenuQRcode/MenuQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import mongoose from "mongoose";

import {
  createActivityLog,
  ActivityType,
  EntityType,
  ActivityStatus,
} from "../Activity_log/activityLog.service";

/**
 * Submit feedback for a menu (public)
 */
export const submitMenuFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { menu_id, type, rating, title, message, category } = req.body;
    const userId = req.user?._id || req.user?.id;

    const rawIp =
      req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress;
    const userIp = Array.isArray(rawIp)
      ? rawIp[0]
      : rawIp?.toString() || undefined;

    if (!menu_id || !type || !message) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Menu ID, feedback type, and message are required",
      };
      return next(error);
    }

    const menu = await MenuQR.findById(menu_id);
    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      };
      return next(error);
    }

    // Rate limiting: max 5 feedbacks per IP per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayFeedbackCount = await MenuFeedback.countDocuments({
      menu_id,
      user_ip: userIp,
      created_at: { $gte: today },
    });

    if (todayFeedbackCount >= 5) {
      const error: ErrorResponse = {
        statusCode: 429,
        status: "fail",
        message:
          "Too many feedback submissions today. Please try again tomorrow.",
      };
      return next(error);
    }

    if (
      (type === "review" || type === "rating") &&
      (!rating || rating < 1 || rating > 5)
    ) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Rating is required for reviews (1-5 stars)",
      };
      return next(error);
    }

    const feedback = new MenuFeedback({
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

    await feedback.save();

    await createActivityLog({
      user_id: menu.user_id,
      activity_type: "menu_feedback_received" as ActivityType,
      title: "New Menu Feedback Received",
      description: `New ${type} for "${menu.title}"`,
      entity_type: "menu_feedback" as EntityType,
      entity_name: menu.title,
      status: "info" as ActivityStatus,
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
  } catch (error) {
    console.error("❌ Error submitting feedback:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message:
        error instanceof Error ? error.message : "Error submitting feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get public feedback for a menu
 */
export const getMenuFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { menu_id } = req.params;
    const { type, category, limit = "10", page = "1" } = req.query;

    if (!menu_id) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Menu ID is required",
      };
      return next(error);
    }

    const menu = await MenuQR.findById(menu_id);
    if (!menu || !menu.is_public) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found or not publicly accessible",
      };
      return next(error);
    }

    const query: any = {
      menu_id,
      is_public: true,
      status: { $ne: "archived" },
    };

    if (type) query.type = type;
    if (category) query.category = category;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const feedback = await MenuFeedback.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("type rating title message category created_at")
      .lean();

    const total = await MenuFeedback.countDocuments(query);

    const stats = await MenuFeedback.aggregate([
      {
        $match: {
          menu_id: new mongoose.Types.ObjectId(menu_id),
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

    const averageRating = await MenuFeedback.aggregate([
      {
        $match: {
          menu_id: new mongoose.Types.ObjectId(menu_id),
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
          average_rating: averageRating[0]?.average?.toFixed(1) || "0.0",
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
  } catch (error) {
    console.error("❌ Error fetching feedback:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get feedback for menu owner (private)
 */
export const getOwnerMenuFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { menu_id } = req.params;
    const { status, type, limit = "20", page = "1" } = req.query;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    if (!menu_id) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Menu ID is required",
      };
      return next(error);
    }

    const menu = await MenuQR.findOne({ _id: menu_id, user_id: userId });
    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "You don't have permission to view feedback for this menu",
      };
      return next(error);
    }

    const query: any = { menu_id };
    if (status) query.status = status;
    if (type) query.type = type;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const feedback = await MenuFeedback.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v")
      .lean();

    const total = await MenuFeedback.countDocuments(query);
    const unreadCount = await MenuFeedback.countDocuments({
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
          by_status: await MenuFeedback.aggregate([
            { $match: { menu_id: new mongoose.Types.ObjectId(menu_id) } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          by_type: await MenuFeedback.aggregate([
            { $match: { menu_id: new mongoose.Types.ObjectId(menu_id) } },
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
  } catch (error) {
    console.error("❌ Error fetching owner feedback:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Mark a single feedback as read (owner only)
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { feedback_id } = req.params;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const feedback = await MenuFeedback.findById(feedback_id).populate<{
      menu_id: { user_id: mongoose.Types.ObjectId; title: string };
    }>({ path: "menu_id", select: "user_id title" });

    if (!feedback) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Feedback not found",
      };
      return next(error);
    }

    const menu = feedback.menu_id as any;
    if (!menu || menu.user_id.toString() !== userId.toString()) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "You don't have permission to update this feedback",
      };
      return next(error);
    }

    if (feedback.status === "pending") {
      feedback.status = "read";
      await feedback.save();
    }

    res.status(200).json({
      status: "success",
      message: "Feedback marked as read",
    });
  } catch (error) {
    console.error("❌ Error marking feedback as read:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Mark all pending feedback as read for a menu (owner only)
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { menu_id } = req.params;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const menu = await MenuQR.findOne({ _id: menu_id, user_id: userId });
    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "You don't have permission to update feedback for this menu",
      };
      return next(error);
    }

    const result = await MenuFeedback.updateMany(
      { menu_id, status: "pending" },
      { $set: { status: "read" } },
    );

    res.status(200).json({
      status: "success",
      message: `${result.modifiedCount} feedback item(s) marked as read`,
      data: { updated_count: result.modifiedCount },
    });
  } catch (error) {
    console.error("❌ Error marking all feedback as read:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Delete feedback permanently (owner only)
 */
export const deleteFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { feedback_id } = req.params;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const feedback = await MenuFeedback.findById(feedback_id).populate<{
      menu_id: { user_id: mongoose.Types.ObjectId; title: string };
    }>({ path: "menu_id", select: "user_id title" });

    if (!feedback) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Feedback not found",
      };
      return next(error);
    }

    const menu = feedback.menu_id as any;
    if (!menu || menu.user_id.toString() !== userId.toString()) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "You don't have permission to delete this feedback",
      };
      return next(error);
    }

    await MenuFeedback.findByIdAndDelete(feedback_id);

    await createActivityLog({
      user_id: userId,
      activity_type: "feedback_deleted" as ActivityType,
      title: "Feedback Deleted",
      description: `Deleted feedback for "${menu.title}"`,
      entity_type: "menu_feedback" as EntityType,
      status: "success" as ActivityStatus,
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting feedback:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error deleting feedback",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get all menus belonging to the authenticated user
 */
export const getUserMenus = async (
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

    const menus = await MenuQR.find({ user_id: userId })
      .select("_id title description is_public created_at")
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: menus,
    });
  } catch (error) {
    console.error("❌ Error fetching user menus:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching menus",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
