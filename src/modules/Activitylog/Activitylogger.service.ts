import { Request } from "express";
import {
  ActivityLog,
  ActivityAction,
  ActivitySeverity,
} from "../Activitylog/Activitylog.model";
import { Types } from "mongoose";

// ── Options ───────────────────────────────────────────────────────────────────

interface LogActivityOptions {
  action: ActivityAction;
  description: string;
  severity?: ActivitySeverity;
  req?: Request; // extracts user + IP automatically when provided
  performedBy?: Types.ObjectId | string;
  performedByName?: string;
  performedByRole?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ── Main service ──────────────────────────────────────────────────────────────

/**
 * Fire-and-forget activity logger.
 * Errors are caught and logged to stderr so they never crash the caller.
 */
export async function logActivity(opts: LogActivityOptions): Promise<void> {
  try {
    const {
      action,
      description,
      severity = "info",
      req,
      resourceType,
      resourceId,
      metadata,
    } = opts;

    // Resolve actor from explicit opts or from the request user
    let performedBy = opts.performedBy;
    let performedByName = opts.performedByName;
    let performedByRole = opts.performedByRole;

    if (req?.user) {
      performedBy ??= req.user._id ?? req.user.id;
      performedByName ??= req.user.name ?? req.user.username ?? "Unknown";
      performedByRole ??= req.user.role ?? "user";
    }

    await ActivityLog.create({
      action,
      description,
      severity,
      performedBy: performedBy
        ? new Types.ObjectId(performedBy.toString())
        : undefined,
      performedByName,
      performedByRole,
      ipAddress: req ? getIP(req) : undefined,
      resourceType,
      resourceId,
      metadata,
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to write log:", err);
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const ActivityLogger = {
  // Auth
  login: (req: Request) =>
    logActivity({ action: "USER_LOGIN", description: `User logged in`, req }),

  logout: (req: Request) =>
    logActivity({ action: "USER_LOGOUT", description: `User logged out`, req }),

  // Menu
  menuCreated: (req: Request, menuId: string, title: string) =>
    logActivity({
      action: "MENU_CREATED",
      description: `Created menu "${title}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  menuUpdated: (req: Request, menuId: string, title: string) =>
    logActivity({
      action: "MENU_UPDATED",
      description: `Updated menu "${title}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  menuDeleted: (req: Request, menuId: string, title: string) =>
    logActivity({
      action: "MENU_DELETED",
      description: `Deleted menu "${title}"`,
      severity: "warning",
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  menuVisibilityChanged: (
    req: Request,
    menuId: string,
    title: string,
    isPublic: boolean,
  ) =>
    logActivity({
      action: isPublic ? "MENU_PUBLISHED" : "MENU_UNPUBLISHED",
      description: `Menu "${title}" set to ${isPublic ? "public" : "private"}`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  categoryAdded: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "CATEGORY_ADDED",
      description: `Added category "${name}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  categoryUpdated: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "CATEGORY_UPDATED",
      description: `Updated category "${name}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  categoryDeleted: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "CATEGORY_DELETED",
      description: `Deleted category "${name}"`,
      severity: "warning",
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  subCategoryAdded: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "SUBCATEGORY_ADDED",
      description: `Added subcategory "${name}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  subCategoryUpdated: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "SUBCATEGORY_UPDATED",
      description: `Updated subcategory "${name}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  subCategoryDeleted: (req: Request, menuId: string, name: string) =>
    logActivity({
      action: "SUBCATEGORY_DELETED",
      description: `Deleted subcategory "${name}"`,
      severity: "warning",
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  itemAdded: (req: Request, menuId: string, itemName: string) =>
    logActivity({
      action: "ITEM_ADDED",
      description: `Added menu item "${itemName}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  itemUpdated: (req: Request, menuId: string, itemName: string) =>
    logActivity({
      action: "ITEM_UPDATED",
      description: `Updated menu item "${itemName}"`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  itemDeleted: (req: Request, menuId: string, itemName: string) =>
    logActivity({
      action: "ITEM_DELETED",
      description: `Deleted menu item "${itemName}"`,
      severity: "warning",
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  itemToggled: (
    req: Request,
    menuId: string,
    itemName: string,
    available: boolean,
  ) =>
    logActivity({
      action: "ITEM_TOGGLED",
      description: `"${itemName}" marked ${available ? "available" : "unavailable"}`,
      req,
      resourceType: "Menu",
      resourceId: menuId,
    }),

  // Orders
  orderCreated: (orderNumber: string, orderId: string, customerName: string) =>
    logActivity({
      action: "ORDER_CREATED",
      description: `New order ${orderNumber} placed by ${customerName}`,
      resourceType: "Order",
      resourceId: orderId,
      metadata: { orderNumber },
    }),

  orderStatusUpdated: (
    req: Request,
    orderNumber: string,
    orderId: string,
    newStatus: string,
  ) =>
    logActivity({
      action: "ORDER_STATUS_UPDATED",
      description: `Order ${orderNumber} status → "${newStatus}"`,
      req,
      resourceType: "Order",
      resourceId: orderId,
      metadata: { orderNumber, newStatus },
    }),

  orderCancelled: (req: Request, orderNumber: string, orderId: string) =>
    logActivity({
      action: "ORDER_CANCELLED",
      description: `Order ${orderNumber} was cancelled`,
      severity: "warning",
      req,
      resourceType: "Order",
      resourceId: orderId,
      metadata: { orderNumber },
    }),

  // Payments
  paymentStatusUpdated: (
    req: Request,
    orderNumber: string,
    orderId: string,
    paymentStatus: string,
    paymentMethod?: string,
  ) =>
    logActivity({
      action: "PAYMENT_STATUS_UPDATED",
      description: `Payment for order ${orderNumber} → "${paymentStatus}"${paymentMethod ? ` via ${paymentMethod}` : ""}`,
      severity: paymentStatus === "paid" ? "info" : "warning",
      req,
      resourceType: "Order",
      resourceId: orderId,
      metadata: { orderNumber, paymentStatus, paymentMethod },
    }),
  // Add to ActivityLogger object in Activitylogger.service.ts
  bookingCreated: (bookingRef: string, bookingId: string, guestName: string) =>
    logActivity({
      action: "BOOKING_CREATED",
      description: `New booking ${bookingRef} by ${guestName}`,
      resourceType: "RoomBooking",
      resourceId: bookingId,
      metadata: { bookingRef },
    }),

  bookingStatusUpdated: (
    req: Request,
    bookingRef: string,
    bookingId: string,
    status: string,
  ) =>
    logActivity({
      action:
        status === "cancelled" ? "BOOKING_CANCELLED" : "BOOKING_CONFIRMED",
      description: `Booking ${bookingRef} status → "${status}"`,
      severity: status === "cancelled" ? "warning" : "info",
      req,
      resourceType: "RoomBooking",
      resourceId: bookingId,
      metadata: { bookingRef, status },
    }),

  bookingPaymentUpdated: (
    req: Request,
    bookingRef: string,
    bookingId: string,
    paymentStatus: string,
  ) =>
    logActivity({
      action: "BOOKING_PAYMENT_UPDATED",
      description: `Payment for booking ${bookingRef} → "${paymentStatus}"`,
      severity: paymentStatus === "paid" ? "info" : "warning",
      req,
      resourceType: "RoomBooking",
      resourceId: bookingId,
      metadata: { bookingRef, paymentStatus },
    }),
};
