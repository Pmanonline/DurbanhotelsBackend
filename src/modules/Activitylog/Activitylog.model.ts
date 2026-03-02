import mongoose, { Document, Schema, Types } from "mongoose";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityAction =
  // ── Auth ──────────────────────────────────────────────────────────────────
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "PASSWORD_CHANGED"
  // ── Menu / F&B ────────────────────────────────────────────────────────────
  | "MENU_CREATED"
  | "MENU_UPDATED"
  | "MENU_DELETED"
  | "MENU_PUBLISHED"
  | "MENU_UNPUBLISHED"
  | "CATEGORY_ADDED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "SUBCATEGORY_ADDED"
  | "SUBCATEGORY_UPDATED"
  | "SUBCATEGORY_DELETED"
  | "ITEM_ADDED"
  | "ITEM_UPDATED"
  | "ITEM_DELETED"
  | "ITEM_TOGGLED"
  // ── Restaurant Orders ─────────────────────────────────────────────────────
  | "ORDER_CREATED"
  | "ORDER_STATUS_UPDATED"
  | "ORDER_CANCELLED"
  | "PAYMENT_STATUS_UPDATED"
  | "PAYMENT_METHOD_UPDATED"
  // ── Hotel Rooms ───────────────────────────────────────────────────────────
  | "ROOM_CREATED"
  | "ROOM_UPDATED"
  | "ROOM_DELETED"
  | "ROOM_PUBLISHED"
  | "ROOM_UNPUBLISHED"
  | "ROOM_STATUS_UPDATED"
  | "ROOM_AVAILABILITY_CHANGED"
  // ── Hotel Bookings ────────────────────────────────────────────────────────
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CHECKED_IN"
  | "BOOKING_CHECKED_OUT"
  | "BOOKING_NO_SHOW"
  | "BOOKING_MODIFIED"
  | "BOOKING_PAYMENT_UPDATED";

export type ActivitySeverity = "info" | "warning" | "critical";

export interface IActivityLog extends Document<Types.ObjectId> {
  action: ActivityAction;
  severity: ActivitySeverity;
  /** Human-readable summary */
  description: string;
  /** The user who triggered the action (null = guest/public) */
  performedBy?: Types.ObjectId;
  performedByName?: string; // snapshot — survives user deletion
  performedByRole?: string;
  /** IP address of the request */
  ipAddress?: string;
  /** Arbitrary extra context */
  metadata?: Record<string, unknown>;
  /** e.g. "Room", "RoomBooking", "Order", "Menu" */
  resourceType?: string;
  /** stringified ObjectId, bookingRef, orderNumber, etc. */
  resourceId?: string;
  createdAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", index: true },
    performedByName: String,
    performedByRole: String,
    ipAddress: String,
    metadata: { type: Schema.Types.Mixed },
    resourceType: { type: String, index: true },
    resourceId: { type: String, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // logs are immutable
    versionKey: false,
  },
);

// TTL: auto-delete logs older than 90 days
ActivityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// Compound indexes for common admin queries
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>(
  "ActivityLog",
  ActivityLogSchema,
);
