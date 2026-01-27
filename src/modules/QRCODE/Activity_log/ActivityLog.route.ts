import { Router } from "express";
import {
  getActivityLogs,
  getRecentActivities,
  getActivityStats,
  getEntityActivities,
} from "./Activitylog.controller ";
import { asyncHandler } from "../../../middlewares/asyncHandler.middleware";
import {
  verifyAuth,
  individualOnly,
} from "../../../middlewares/roleVerification.middleware";

const activityLogRouter = Router();

// All routes require authentication and individual role
activityLogRouter.use(verifyAuth, individualOnly);

/**
 * @swagger
 * tags:
 *   name: ActivityLogs
 *   description: API endpoints to manage activity logs
 */

/**
 * @swagger
 * /api/activity-logs:
 *   get:
 *     summary: Get paginated activity logs with filters
 *     description: Retrieve activity logs for the authenticated user with optional filters
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: activity_type
 *         schema:
 *           type: string
 *           enum: [menu_create, menu_update, menu_delete, qr_scan, login, logout, profile_update]
 *         description: Filter by activity type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, pending]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an individual user
 */
activityLogRouter.route("/").get(asyncHandler(getActivityLogs));

/**
 * @swagger
 * /api/activity-logs/recent:
 *   get:
 *     summary: Get recent activities for dashboard
 *     description: Retrieve recent activities for the authenticated user's dashboard
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of recent activities to retrieve
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an individual user
 */
activityLogRouter.route("/recent").get(asyncHandler(getRecentActivities));

/**
 * @swagger
 * /api/activity-logs/stats:
 *   get:
 *     summary: Get activity statistics
 *     description: Retrieve activity statistics for the authenticated user
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Activity statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an individual user
 */
activityLogRouter.route("/stats").get(asyncHandler(getActivityStats));

/**
 * @swagger
 * /api/activity-logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get activity logs for a specific entity
 *     description: Retrieve activity logs for a specific entity (menu, qr code, etc.)
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [menu, qr_code, user]
 *         description: Type of entity
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to retrieve
 *     responses:
 *       200:
 *         description: Entity activities retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an individual user
 *       404:
 *         description: Entity not found
 */
activityLogRouter
  .route("/entity/:entityType/:entityId")
  .get(asyncHandler(getEntityActivities));

export default activityLogRouter;
