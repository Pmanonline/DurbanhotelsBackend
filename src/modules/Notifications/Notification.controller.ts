import { Request, Response, NextFunction } from "express";
import { Notification } from "../Notifications/Notification.model";
import { ErrorResponse } from "../../utilities/errorHandler.util";
import mongoose from "mongoose";

// ── Helpers ───────────────────────────────────────────────────────────────────

function recipientFilter(req: Request): string {
  const role = req.user?.role;
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return req.user?._id?.toString() ?? req.user?.id?.toString() ?? "";
}

// ── Get notifications ─────────────────────────────────────────────────────────
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      isRead,
      event,
      limit = "50",
      page = "1",
    } = req.query as Record<string, string>;
    const recipient = recipientFilter(req);

    const query: Record<string, unknown> = { recipients: recipient };
    if (isRead !== undefined) query.isRead = isRead === "true";
    if (event) query.event = event;

    const limitNum = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipients: recipient, isRead: false }),
    ]);

    res.status(200).json({
      status: "success",
      results: notifications.length,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { notifications },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching notifications",
    } as ErrorResponse);
  }
};

// ── Mark one as read ──────────────────────────────────────────────────────────
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return next({
        statusCode: 400,
        status: "fail",
        message: "Invalid notification ID",
      } as ErrorResponse);

    const recipient = recipientFilter(req);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipients: recipient },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Notification not found",
      } as ErrorResponse);

    res.status(200).json({ status: "success", data: { notification } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating notification",
    } as ErrorResponse);
  }
};

// ── Mark all as read ──────────────────────────────────────────────────────────
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const recipient = recipientFilter(req);
    const result = await Notification.updateMany(
      { recipients: recipient, isRead: false },
      { $set: { isRead: true } },
    );
    res.status(200).json({
      status: "success",
      message: `${result.modifiedCount} notification(s) marked as read`,
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating notifications",
    } as ErrorResponse);
  }
};

// ── Delete one notification ───────────────────────────────────────────────────
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return next({
        statusCode: 400,
        status: "fail",
        message: "Invalid notification ID",
      } as ErrorResponse);

    const recipient = recipientFilter(req);
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipients: recipient,
    });

    if (!notification)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Notification not found",
      } as ErrorResponse);

    res
      .status(200)
      .json({ status: "success", message: "Notification deleted" });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting notification",
    } as ErrorResponse);
  }
};

// ── Unread count only (for polling/badge) ────────────────────────────────────
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const recipient = recipientFilter(req);
    const count = await Notification.countDocuments({
      recipients: recipient,
      isRead: false,
    });
    res.status(200).json({ status: "success", data: { unreadCount: count } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching count",
    } as ErrorResponse);
  }
};
