import { Router } from "express";
import {
  getActivityLogs,
  getActivityLogById,
  getActivityStats,
} from "../Activitylog/Activitylog.controller";
import {
  verifyAuth,
  requireRole,
} from "../../middlewares/roleVerification.middleware";

const router = Router();

// All activity log routes are admin-only
router.use(verifyAuth);

/**
 * GET /activity-logs
 * Query: action, severity, resourceType, resourceId, performedBy,
 *        startDate, endDate, page, limit
 */
router.get("/", getActivityLogs);

/**
 * GET /activity-logs/stats
 * Query: days (default 7)
 * Returns per-action counts, per-severity counts, and per-day counts.
 * Must come before /:id so "stats" isn't treated as an ObjectId.
 */
router.get("/stats", getActivityStats);

/**
 * GET /activity-logs/:id
 */
router.get("/:id", getActivityLogById);

export const activityLogRouter = router;
