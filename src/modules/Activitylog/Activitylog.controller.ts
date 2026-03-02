import { Request, Response, NextFunction } from "express";
import { ActivityLog, ActivityAction } from "../Activitylog/Activitylog.model";
import { ErrorResponse } from "../../utilities/errorHandler.util";

// ── Get activity logs (admin only) ────────────────────────────────────────────
export const getActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      action,
      severity,
      resourceType,
      resourceId,
      performedBy,
      startDate,
      endDate,
      limit = "50",
      page = "1",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};

    if (action) query.action = action as ActivityAction;
    if (severity) query.severity = severity;
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;
    if (performedBy) query.performedBy = performedBy;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      query.createdAt = dateFilter;
    }

    const limitNum = Math.min(Number(limit), 200);
    const skip = (Number(page) - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      results: logs.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { logs },
    });
  } catch (err) {
    console.error("getActivityLogs error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching activity logs",
    } as ErrorResponse);
  }
};

// ── Get single log ────────────────────────────────────────────────────────────
export const getActivityLogById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const log = await ActivityLog.findById(req.params.id).lean();
    if (!log)
      return next({
        statusCode: 404,
        status: "fail",
        message: "Log entry not found",
      } as ErrorResponse);

    res.status(200).json({ status: "success", data: { log } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching log",
    } as ErrorResponse);
  }
};

// ── Get log stats (action counts per day) ─────────────────────────────────────
export const getActivityStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { days = "7" } = req.query as { days?: string };
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const [byAction, bySeverity, byDay] = await Promise.all([
      // Count per action type
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Count per severity
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      // Count per day
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
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

    res.status(200).json({
      status: "success",
      data: { byAction, bySeverity, byDay, period: `last ${days} days` },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching activity stats",
    } as ErrorResponse);
  }
};
