import mongoose, { Document, Schema, Types } from "mongoose";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationEvent =
  // ── Restaurant / Food & Beverage
  | "NEW_ORDER"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_STATUS_CHANGED"
  | "LOW_STOCK_ALERT"
  // ── Hotel / Room Booking
  | "NEW_BOOKING"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CHECKED_IN"
  | "BOOKING_CHECKED_OUT"
  | "BOOKING_MODIFIED"
  | "BOOKING_PAYMENT_RECEIVED"
  | "BOOKING_PAYMENT_UPDATED"
  | "BOOKING_NO_SHOW"
  | "BOOKING_REMINDER"
  | "ROOM_STATUS_CHANGED"
  | "ROOM_AVAILABILITY_CHANGED"
  | "ROOM_CREATED"
  | "ROOM_UPDATED"
  | "ROOM_DELETED"
  | "ROOM_PUBLISHED"
  | "ROOM_UNPUBLISHED"
  // ── System
  | "SYSTEM_ALERT"
  | "USER_ACTION";

export type NotificationAudience = "admin" | "staff" | "guest" | string;

export interface INotification extends Document<Types.ObjectId> {
  event: NotificationEvent;
  title: string;
  message: string;
  recipients: NotificationAudience[];
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const NotificationSchema = new Schema<INotification>(
  {
    event: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    recipients: { type: [String], required: true, index: true },
    isRead: { type: Boolean, default: false, index: true },
    actionUrl: String,
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

// TTL: auto-delete notifications older than 30 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
NotificationSchema.index({ recipients: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
