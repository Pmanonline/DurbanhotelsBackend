import { Request } from "express";
import { Notification } from "../Notifications/Notification.model";
import { ActivityLog } from "../Activitylog/Activitylog.model";
import { IRoom } from "../ROOMS/Room.model";
import { IRoomBooking } from "../ROOMS/Booking.model";

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── IP helper ─────────────────────────────────────────────────────────────────

function getIp(req?: Request): string {
  if (!req) return "";
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

// ── Silent fire-and-forget ────────────────────────────────────────────────────
// Notification/log failures must NEVER crash the main API response.

function fire(promise: Promise<unknown>, label: string): void {
  promise.catch((err) =>
    console.error(`[RoomNotificationService] ${label} failed:`, err),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOM CRUD EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export function notifyRoomCreated(room: IRoom, req?: Request): void {
  fire(
    ActivityLog.create({
      action: "ROOM_CREATED",
      severity: "info",
      description: `New room created: "${room.name}" (${room.category}) — ${fmt(room.pricePerNight)}/night`,
      resourceType: "Room",
      resourceId: String(room._id),
      ipAddress: getIp(req),
      metadata: {
        roomId: String(room._id),
        slug: room.slug,
        category: room.category,
        pricePerNight: room.pricePerNight,
        isPublished: room.isPublished,
      },
    }),
    "ROOM_CREATED activity",
  );

  fire(
    Notification.create({
      event: "ROOM_CREATED",
      title: "New Room Added",
      message: `"${room.name}" has been created and is currently ${room.isPublished ? "live" : "in draft"}.`,
      recipients: ["admin"],
      actionUrl: `/admin/rooms/${room._id}/edit`,
      metadata: {
        roomId: String(room._id),
        name: room.name,
        category: room.category,
      },
    }),
    "ROOM_CREATED notification",
  );
}

export function notifyRoomUpdated(
  room: IRoom,
  changedFields: string[],
  req?: Request,
): void {
  fire(
    ActivityLog.create({
      action: "ROOM_UPDATED",
      severity: "info",
      description: `Room "${room.name}" updated — changed: ${changedFields.join(", ")}`,
      resourceType: "Room",
      resourceId: String(room._id),
      ipAddress: getIp(req),
      metadata: { roomId: String(room._id), changedFields },
    }),
    "ROOM_UPDATED activity",
  );
}

export function notifyRoomDeleted(
  roomName: string,
  roomId: string,
  req?: Request,
): void {
  fire(
    ActivityLog.create({
      action: "ROOM_DELETED",
      severity: "warning",
      description: `Room "${roomName}" was permanently deleted`,
      resourceType: "Room",
      resourceId: roomId,
      ipAddress: getIp(req),
      metadata: { roomId, roomName },
    }),
    "ROOM_DELETED activity",
  );

  fire(
    Notification.create({
      event: "ROOM_DELETED",
      title: "Room Deleted",
      message: `Room "${roomName}" has been permanently removed.`,
      recipients: ["admin"],
      metadata: { roomId, roomName },
    }),
    "ROOM_DELETED notification",
  );
}

export function notifyRoomPublishToggled(room: IRoom, req?: Request): void {
  const isPublished = room.isPublished;

  fire(
    ActivityLog.create({
      action: isPublished ? "ROOM_PUBLISHED" : "ROOM_UNPUBLISHED",
      severity: "info",
      description: isPublished
        ? `Room "${room.name}" is now live on the website`
        : `Room "${room.name}" has been unpublished (hidden from guests)`,
      resourceType: "Room",
      resourceId: String(room._id),
      ipAddress: getIp(req),
      metadata: { roomId: String(room._id), isPublished },
    }),
    "ROOM_PUBLISH_TOGGLE activity",
  );

  fire(
    Notification.create({
      event: isPublished ? "ROOM_PUBLISHED" : "ROOM_UNPUBLISHED",
      title: isPublished ? "Room Published" : "Room Unpublished",
      message: isPublished
        ? `"${room.name}" is now visible and bookable on the website.`
        : `"${room.name}" has been hidden from guests.`,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/rooms/${room._id}/edit`,
      metadata: { roomId: String(room._id), name: room.name, isPublished },
    }),
    "ROOM_PUBLISH_TOGGLE notification",
  );
}

export function notifyRoomStatusChanged(
  room: IRoom,
  previousStatus: string,
  req?: Request,
): void {
  fire(
    ActivityLog.create({
      action: "ROOM_STATUS_UPDATED",
      severity: room.status === "maintenance" ? "warning" : "info",
      description: `Room "${room.name}" status: ${previousStatus.toUpperCase()} → ${room.status.toUpperCase()}`,
      resourceType: "Room",
      resourceId: String(room._id),
      ipAddress: getIp(req),
      metadata: {
        roomId: String(room._id),
        previousStatus,
        newStatus: room.status,
      },
    }),
    "ROOM_STATUS_UPDATED activity",
  );

  fire(
    Notification.create({
      event: "ROOM_STATUS_CHANGED",
      title: `Room Status: ${room.status.toUpperCase()}`,
      message: `"${room.name}" is now ${room.status}. Previously: ${previousStatus}.`,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/rooms/${room._id}/edit`,
      metadata: {
        roomId: String(room._id),
        previousStatus,
        newStatus: room.status,
      },
    }),
    "ROOM_STATUS_CHANGED notification",
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKING EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export function notifyBookingCreated(
  booking: IRoomBooking,
  req?: Request,
): void {
  const nights = booking.nights;
  const checkIn = fmtDate(booking.checkIn);
  const checkOut = fmtDate(booking.checkOut);
  const total = fmt(booking.grandTotal);

  fire(
    ActivityLog.create({
      action: "BOOKING_CREATED",
      severity: "info",
      description: `New booking ${booking.bookingRef} — ${booking.guestName} · ${booking.roomSnapshot.name} · ${checkIn} → ${checkOut} (${nights} night${nights !== 1 ? "s" : ""}) · ${total}`,
      resourceType: "RoomBooking",
      resourceId: booking.bookingRef,
      ipAddress: getIp(req),
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.guestEmail,
        roomName: booking.roomSnapshot.name,
        roomNumber: booking.roomSnapshot.roomNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        adults: booking.adults,
        children: booking.children,
        totalGuests: booking.totalGuests,
        grandTotal: booking.grandTotal,
        depositAmount: booking.depositAmount,
        paymentMethod: booking.paymentMethod,
        source: booking.source,
      },
    }),
    "BOOKING_CREATED activity",
  );

  fire(
    Notification.create({
      event: "NEW_BOOKING",
      title: `New Booking — ${booking.roomSnapshot.name}`,
      message: `${booking.guestName} booked ${booking.roomSnapshot.name} · ${checkIn} → ${checkOut} · ${nights} night${nights !== 1 ? "s" : ""} · ${total}`,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/rooms/bookings/${booking._id}`,
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        roomName: booking.roomSnapshot.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        grandTotal: booking.grandTotal,
      },
    }),
    "NEW_BOOKING notification",
  );
}

export function notifyBookingStatusChanged(
  booking: IRoomBooking,
  previousStatus: string,
  req?: Request,
): void {
  // Map booking status → activity action
  const ACTION_MAP: Record<string, ActivityAction> = {
    confirmed: "BOOKING_CONFIRMED",
    cancelled: "BOOKING_CANCELLED",
    "checked-in": "BOOKING_CHECKED_IN",
    "checked-out": "BOOKING_CHECKED_OUT",
    "no-show": "BOOKING_NO_SHOW",
  };

  // Map status → notification event
  const EVENT_MAP: Record<string, NotificationEvent> = {
    confirmed: "BOOKING_CONFIRMED",
    cancelled: "BOOKING_CANCELLED",
    "checked-in": "BOOKING_CHECKED_IN",
    "checked-out": "BOOKING_CHECKED_OUT",
    "no-show": "BOOKING_NO_SHOW",
  };

  const SEVERITY_MAP: Record<string, ActivitySeverity> = {
    confirmed: "info",
    cancelled: "warning",
    "checked-in": "info",
    "checked-out": "info",
    "no-show": "warning",
  };

  const TITLE_MAP: Record<string, string> = {
    confirmed: "Booking Confirmed",
    cancelled: "Booking Cancelled",
    "checked-in": "Guest Checked In",
    "checked-out": "Guest Checked Out",
    "no-show": "No-Show Recorded",
    pending: "Booking Pending",
  };

  const action = ACTION_MAP[booking.status] ?? "BOOKING_MODIFIED";
  const event = EVENT_MAP[booking.status] ?? "BOOKING_MODIFIED";
  const severity = SEVERITY_MAP[booking.status] ?? "info";
  const title = TITLE_MAP[booking.status] ?? "Booking Updated";

  const description =
    `Booking ${booking.bookingRef} (${booking.guestName} · ${booking.roomSnapshot.name}): ` +
    `${previousStatus.toUpperCase()} → ${booking.status.toUpperCase()}` +
    (booking.cancelReason ? ` — Reason: ${booking.cancelReason}` : "");

  fire(
    ActivityLog.create({
      action,
      severity,
      description,
      resourceType: "RoomBooking",
      resourceId: booking.bookingRef,
      ipAddress: getIp(req),
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        roomName: booking.roomSnapshot.name,
        previousStatus,
        newStatus: booking.status,
        cancelReason: booking.cancelReason || undefined,
        confirmedAt: booking.confirmedAt || undefined,
        checkedInAt: booking.checkedInAt || undefined,
        checkedOutAt: booking.checkedOutAt || undefined,
        cancelledAt: booking.cancelledAt || undefined,
      },
    }),
    `${action} activity`,
  );

  fire(
    Notification.create({
      event,
      title,
      message:
        `${booking.guestName} · ${booking.roomSnapshot.name} · Ref: ${booking.bookingRef}` +
        ` — ${previousStatus} → ${booking.status}` +
        (booking.cancelReason ? ` (${booking.cancelReason})` : ""),
      recipients: ["admin", "staff"],
      actionUrl: `/admin/rooms/bookings/${booking._id}`,
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        previousStatus,
        newStatus: booking.status,
      },
    }),
    `${action} notification`,
  );
}

export function notifyBookingPaymentUpdated(
  booking: IRoomBooking,
  previousPaymentStatus: string,
  req?: Request,
): void {
  const isPaid = booking.paymentStatus === "paid";

  fire(
    ActivityLog.create({
      action: "BOOKING_PAYMENT_UPDATED",
      severity: "info",
      description: `Payment for booking ${booking.bookingRef} (${booking.guestName}): ${previousPaymentStatus.toUpperCase()} → ${booking.paymentStatus.toUpperCase()} · ${fmt(booking.grandTotal)}`,
      resourceType: "RoomBooking",
      resourceId: booking.bookingRef,
      ipAddress: getIp(req),
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        roomName: booking.roomSnapshot.name,
        previousPaymentStatus,
        newPaymentStatus: booking.paymentStatus,
        grandTotal: booking.grandTotal,
        paymentMethod: booking.paymentMethod,
        paymentNotes: booking.paymentNotes || undefined,
      },
    }),
    "BOOKING_PAYMENT_UPDATED activity",
  );

  fire(
    Notification.create({
      event: isPaid ? "BOOKING_PAYMENT_RECEIVED" : "BOOKING_PAYMENT_UPDATED",
      title: isPaid
        ? `Payment Received — ${booking.bookingRef}`
        : `Payment Updated — ${booking.bookingRef}`,
      message: `${booking.guestName} · ${booking.roomSnapshot.name} · ${fmt(booking.grandTotal)} · ${booking.paymentMethod} · ${previousPaymentStatus} → ${booking.paymentStatus}`,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/rooms/bookings/${booking._id}`,
      metadata: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        previousPaymentStatus,
        newPaymentStatus: booking.paymentStatus,
        grandTotal: booking.grandTotal,
      },
    }),
    "BOOKING_PAYMENT notification",
  );
}

// ── Re-export types so the controller can use them without extra imports ───────
import type { ActivityAction } from "../Activitylog/Activitylog.model";
import type { NotificationEvent } from "../Notifications/Notification.model";
import type { ActivitySeverity } from "../Activitylog/Activitylog.model";
