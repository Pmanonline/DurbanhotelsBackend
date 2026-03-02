// routes/notification.routes.ts
import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "./Notification.controller";
import { verifyAuth } from "../../middlewares/roleVerification.middleware";

const router = Router();

// All notification routes require authentication (any authenticated user)
router.use(verifyAuth);

/**
 * GET /notifications
 *   Query params: isRead, event, page, limit
 */
router.get("/getNotifications", getNotifications);

/** GET /notifications/unread-count — lightweight badge endpoint */
router.get("/unread-count", getUnreadCount);

/** PATCH /notifications/mark-all-read */
router.patch("/mark-all-read", markAllAsRead);

/** PATCH /notifications/:id/read */
router.patch("/:id/read", markAsRead);

/** DELETE /notifications/:id */
router.delete("/deleteNotification/:id", deleteNotification);

export const notificationRouter = router;
