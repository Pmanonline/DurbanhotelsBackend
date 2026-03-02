// import {
//   Notification,
//   NotificationEvent,
//   NotificationAudience,
// } from "../Notifications/Notification.model";
// import { IOrder } from "../../modules/MENU/models/Order.model";
// import { IRoomBooking } from "../../modules/ROOMS/Booking.model";
// import { generateMailTransporter } from "../../utilities/email.utils";
// import {
//   wrapEmailTemplate,
//   orderEmailBody,
//   simpleNotificationBody,
//   paymentConfirmationBody,
//   statusUpdateBody,
// } from "./emailTemplates";

// // Email transport
// const transporter = generateMailTransporter();

// const FROM_ADDRESS = `"${process.env.SMTP_FROM_NAME || "Duban International Hotel"}" <${process.env.SMTP_USER || process.env.EMAIL_USERNAME}>`;
// const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

// /**
//  * Status labels for display
//  */
// const STATUS_LABELS: Record<string, string> = {
//   confirmed: "Confirmed ✅",
//   preparing: "Being Prepared 👨‍🍳",
//   ready: "Ready for Pickup / Service 🍽️",
//   served: "Served ✔️",
//   cancelled: "Cancelled ❌",
// };

// /**
//  * Booking status labels
//  */
// const BOOKING_STATUS_LABELS: Record<string, string> = {
//   pending: "Pending ⏳",
//   confirmed: "Confirmed ✅",
//   checked_in: "Checked In 🏨",
//   checked_out: "Checked Out 🚪",
//   cancelled: "Cancelled ❌",
//   no_show: "No Show ⚠️",
// };

// /**
//  * Send email helper
//  */
// const sendEmail = async (
//   to: string | string[],
//   subject: string,
//   html: string,
// ): Promise<void> => {
//   if (!process.env.SMTP_USER && !process.env.EMAIL_USERNAME) {
//     console.warn("[Email] SMTP not configured — skipping email");
//     return;
//   }

//   try {
//     await transporter.sendMail({
//       from: FROM_ADDRESS,
//       to: Array.isArray(to) ? to.join(",") : to,
//       subject,
//       html,
//     });
//   } catch (err) {
//     console.error("[Email] Failed to send:", err);
//   }
// };

// /**
//  * Notification service for in-app and email notifications
//  */
// class NotificationService {
//   /**
//    * Create an in-app notification
//    */
//   async createInAppNotification(opts: {
//     event: NotificationEvent;
//     title: string;
//     message: string;
//     recipients: NotificationAudience[];
//     actionUrl?: string;
//     metadata?: Record<string, unknown>;
//   }): Promise<void> {
//     try {
//       await Notification.create(opts);
//     } catch (err) {
//       console.error("[Notification] Failed to create:", err);
//     }
//   }

//   // ==================== RESTAURANT NOTIFICATIONS ====================

//   /**
//    * New order notification
//    */
//   async newOrder(order: IOrder): Promise<void> {
//     const title = `New Order: ${order.orderNumber}`;
//     const message = `${order.customerName} placed a ${order.orderType.replace("-", " ")} order worth ₦${order.total.toLocaleString()}`;

//     // In-app notification → staff sees it
//     await this.createInAppNotification({
//       event: "NEW_ORDER",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/orders/${order._id}`,
//       metadata: {
//         orderId: order._id.toString(),
//         orderNumber: order.orderNumber,
//         customerName: order.customerName,
//         total: order.total,
//         orderType: order.orderType,
//       },
//     });

//     // Email → admin
//     if (ADMIN_EMAIL) {
//       const headline = `New ${order.orderType.replace("-", " ")} order received`;
//       const extra = `From <strong>${order.customerName}</strong> (${order.customerPhone})`;

//       await sendEmail(
//         ADMIN_EMAIL,
//         `🛎️ New Order Received — ${order.orderNumber}`,
//         wrapEmailTemplate(title, orderEmailBody(order, headline, extra)),
//       );
//     }

//     // Email confirmation → customer (if email provided)
//     const customerEmail = (order as any).customerEmail as string | undefined;
//     if (customerEmail) {
//       const headline = "Thank you! Your order has been received.";
//       const extra = `We'll start preparing it shortly. Track your order using this ID: <strong>${order.guestId}</strong>`;

//       await sendEmail(
//         customerEmail,
//         `✅ Order Confirmed — ${order.orderNumber}`,
//         wrapEmailTemplate(
//           "Order Confirmation",
//           orderEmailBody(order, headline, extra),
//         ),
//       );
//     }
//   }

//   /**
//    * Order status changed notification
//    */
//   async orderStatusChanged(
//     order: IOrder,
//     previousStatus: string,
//   ): Promise<void> {
//     const label = STATUS_LABELS[order.status] ?? order.status;
//     const title = `Order ${order.orderNumber} — ${label}`;
//     const message = `Status changed from "${previousStatus}" to "${order.status}"`;

//     await this.createInAppNotification({
//       event: "ORDER_STATUS_CHANGED",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/orders/${order._id}`,
//       metadata: {
//         orderId: order._id.toString(),
//         orderNumber: order.orderNumber,
//         previousStatus,
//         newStatus: order.status,
//       },
//     });

//     // Email customer when status is meaningful (confirmed, ready, served, cancelled)
//     const notifyCustomerStatuses = [
//       "confirmed",
//       "ready",
//       "served",
//       "cancelled",
//     ];
//     const customerEmail = (order as any).customerEmail as string | undefined;

//     if (customerEmail && notifyCustomerStatuses.includes(order.status)) {
//       const subjectMap: Record<string, string> = {
//         confirmed: `✅ Your order ${order.orderNumber} is confirmed!`,
//         ready: `🍽️ Your order ${order.orderNumber} is ready!`,
//         served: `✔️ Your order ${order.orderNumber} has been served`,
//         cancelled: `❌ Your order ${order.orderNumber} has been cancelled`,
//       };

//       await sendEmail(
//         customerEmail,
//         subjectMap[order.status] ?? `Order ${order.orderNumber} — ${label}`,
//         wrapEmailTemplate(
//           "Order Status Update",
//           statusUpdateBody(order, order.status, label),
//         ),
//       );
//     }
//   }

//   /**
//    * Payment status changed notification
//    */
//   async paymentStatusChanged(
//     order: IOrder,
//     previousPaymentStatus: string,
//   ): Promise<void> {
//     const isPaid = order.paymentStatus === "paid";
//     const title = `Payment ${isPaid ? "Received" : "Updated"} — ${order.orderNumber}`;
//     const message = `Payment for order ${order.orderNumber} changed from "${previousPaymentStatus}" to "${order.paymentStatus}"${order.paymentMethod ? ` via ${order.paymentMethod}` : ""}`;

//     await this.createInAppNotification({
//       event: isPaid ? "PAYMENT_RECEIVED" : "PAYMENT_STATUS_CHANGED",
//       title,
//       message,
//       recipients: ["admin"],
//       actionUrl: `/orders/${order._id}`,
//       metadata: {
//         orderId: order._id.toString(),
//         orderNumber: order.orderNumber,
//         previousPaymentStatus,
//         paymentStatus: order.paymentStatus,
//         paymentMethod: order.paymentMethod,
//         total: order.total,
//       },
//     });

//     // Email admin for payment received
//     if (isPaid && ADMIN_EMAIL) {
//       await sendEmail(
//         ADMIN_EMAIL,
//         `💰 Payment Received — ${order.orderNumber}`,
//         wrapEmailTemplate("Payment Received", paymentConfirmationBody(order)),
//       );
//     }

//     // Email customer on payment confirmation
//     const customerEmail = (order as any).customerEmail as string | undefined;
//     if (customerEmail && isPaid) {
//       await sendEmail(
//         customerEmail,
//         `💳 Payment Confirmed — ${order.orderNumber}`,
//         wrapEmailTemplate(
//           "Payment Confirmation",
//           paymentConfirmationBody(order),
//         ),
//       );
//     }
//   }

//   // ==================== HOTEL BOOKING NOTIFICATIONS ====================

//   /**
//    * New booking notification
//    */
//   async newBooking(booking: IRoomBooking): Promise<void> {
//     const title = `New Booking: ${booking.bookingNumber}`;
//     const message = `${booking.guestName} booked ${booking.roomSnapshot.roomType} for ${booking.nights} nights (₦${booking.priceBreakdown.total.toLocaleString()})`;

//     // In-app notification for staff
//     await this.createInAppNotification({
//       event: "NEW_BOOKING",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         roomNumber: booking.roomSnapshot.roomNumber,
//         roomType: booking.roomSnapshot.roomType,
//         checkIn: booking.checkIn,
//         checkOut: booking.checkOut,
//         nights: booking.nights,
//         totalAmount: booking.priceBreakdown.total,
//       },
//     });

//     // Email to admin
//     if (ADMIN_EMAIL) {
//       await sendEmail(
//         ADMIN_EMAIL,
//         `🏨 New Booking — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           title,
//           this.buildBookingEmailBody(booking, "New Booking Received"),
//         ),
//       );
//     }

//     // Email confirmation to guest
//     if (booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `✅ Booking Confirmed — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Booking Confirmation",
//           this.buildBookingEmailBody(
//             booking,
//             "Thank you for choosing Duban International Hotel!",
//           ),
//         ),
//       );
//     }
//   }

//   /**
//    * Booking confirmed notification
//    */
//   async bookingConfirmed(booking: IRoomBooking): Promise<void> {
//     const title = `Booking Confirmed: ${booking.bookingNumber}`;
//     const message = `${booking.guestName}'s booking has been confirmed`;

//     await this.createInAppNotification({
//       event: "BOOKING_CONFIRMED",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//       },
//     });

//     // Email confirmation to guest
//     if (booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `✅ Booking Confirmed — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Booking Confirmation",
//           this.buildBookingEmailBody(
//             booking,
//             "Your booking has been confirmed!",
//           ),
//         ),
//       );
//     }
//   }

//   /**
//    * Booking cancelled notification
//    */
//   async bookingCancelled(
//     booking: IRoomBooking,
//     reason?: string,
//   ): Promise<void> {
//     const title = `Booking Cancelled: ${booking.bookingNumber}`;
//     const message = reason
//       ? `${booking.guestName}'s booking was cancelled: ${reason}`
//       : `${booking.guestName}'s booking was cancelled`;

//     await this.createInAppNotification({
//       event: "BOOKING_CANCELLED",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         reason,
//       },
//     });

//     // Email notification to guest
//     if (booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `❌ Booking Cancelled — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Booking Cancelled",
//           `<p>Dear ${booking.guestName},</p>
//            <p>Your booking <strong>${booking.bookingNumber}</strong> has been cancelled.</p>
//            ${reason ? `<p>Reason: ${reason}</p>` : ""}
//            <p>If you have any questions, please contact us.</p>`,
//         ),
//       );
//     }
//   }

//   /**
//    * Guest checked in notification
//    */
//   async guestCheckedIn(booking: IRoomBooking): Promise<void> {
//     const title = `Guest Checked In: ${booking.bookingNumber}`;
//     const message = `${booking.guestName} has checked into room ${booking.roomSnapshot.roomNumber}`;

//     await this.createInAppNotification({
//       event: "BOOKING_CHECKED_IN",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         roomNumber: booking.roomSnapshot.roomNumber,
//       },
//     });
//   }

//   /**
//    * Guest checked out notification
//    */
//   async guestCheckedOut(booking: IRoomBooking): Promise<void> {
//     const title = `Guest Checked Out: ${booking.bookingNumber}`;
//     const message = `${booking.guestName} has checked out from room ${booking.roomSnapshot.roomNumber}`;

//     await this.createInAppNotification({
//       event: "BOOKING_CHECKED_OUT",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         roomNumber: booking.roomSnapshot.roomNumber,
//       },
//     });
//   }

//   /**
//    * Booking modified notification
//    */
//   async bookingModified(
//     booking: IRoomBooking,
//     changes: Record<string, any>,
//   ): Promise<void> {
//     const title = `Booking Modified: ${booking.bookingNumber}`;
//     const message = `${booking.guestName}'s booking details have been updated`;

//     await this.createInAppNotification({
//       event: "BOOKING_MODIFIED",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         changes,
//       },
//     });

//     // Email notification to guest
//     if (booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `📝 Booking Modified — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Booking Updated",
//           `<p>Dear ${booking.guestName},</p>
//            <p>Your booking <strong>${booking.bookingNumber}</strong> has been modified.</p>
//            <p>Please review your updated booking details in your account.</p>`,
//         ),
//       );
//     }
//   }

//   /**
//    * Booking payment received notification
//    */
//   async bookingPaymentReceived(
//     booking: IRoomBooking,
//     amount: number,
//     method: string,
//   ): Promise<void> {
//     const title = `Payment Received: ${booking.bookingNumber}`;
//     const message = `Payment of ₦${amount.toLocaleString()} received via ${method} for booking ${booking.bookingNumber}`;

//     await this.createInAppNotification({
//       event: "BOOKING_PAYMENT_RECEIVED",
//       title,
//       message,
//       recipients: ["admin"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         amount,
//         paymentMethod: method,
//       },
//     });

//     // Email confirmation to guest
//     if (booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `💰 Payment Confirmed — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Payment Confirmation",
//           `<h2>Payment Received ✅</h2>
//            <p>Your payment of <strong>₦${amount.toLocaleString()}</strong> for booking <strong>${booking.bookingNumber}</strong> has been confirmed.</p>
//            <p>Thank you for choosing Duban International Hotel!</p>`,
//         ),
//       );
//     }
//   }

//   /**
//    * Booking reminder notification
//    */
//   async bookingReminder(
//     booking: IRoomBooking,
//     daysAhead: number,
//   ): Promise<void> {
//     const title = `Upcoming Booking: ${booking.bookingNumber}`;
//     const message = `${booking.guestName} arrives in ${daysAhead} days (${new Date(booking.checkIn).toLocaleDateString()})`;

//     await this.createInAppNotification({
//       event: "BOOKING_REMINDER",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: `/admin/bookings/${booking._id}`,
//       metadata: {
//         bookingId: booking._id.toString(),
//         bookingNumber: booking.bookingNumber,
//         guestName: booking.guestName,
//         checkIn: booking.checkIn,
//         daysAhead,
//       },
//     });

//     // Email reminder to guest (for day-before reminder)
//     if (daysAhead === 1 && booking.guestEmail) {
//       await sendEmail(
//         booking.guestEmail,
//         `🔔 Your Stay Tomorrow — ${booking.bookingNumber}`,
//         wrapEmailTemplate(
//           "Booking Reminder",
//           `<p>Dear ${booking.guestName},</p>
//            <p>This is a reminder that you're checking in <strong>tomorrow</strong> at Duban International Hotel.</p>
//            <p>Check-in: ${new Date(booking.checkIn).toLocaleString()}</p>
//            <p>We look forward to welcoming you!</p>`,
//         ),
//       );
//     }
//   }

//   /**
//    * Room availability changed notification
//    */
//   async roomAvailabilityChanged(
//     roomNumber: string,
//     status: string,
//     date: Date,
//   ): Promise<void> {
//     const title = `Room ${roomNumber} Status Changed`;
//     const message = `Room ${roomNumber} is now ${status} for ${date.toLocaleDateString()}`;

//     await this.createInAppNotification({
//       event: "ROOM_AVAILABILITY_CHANGED",
//       title,
//       message,
//       recipients: ["admin", "staff"],
//       actionUrl: "/admin/availability",
//       metadata: {
//         roomNumber,
//         status,
//         date: date.toISOString(),
//       },
//     });
//   }

//   /**
//    * Send a custom notification
//    */
//   async sendCustomNotification(
//     to: string,
//     subject: string,
//     title: string,
//     message: string,
//   ): Promise<void> {
//     await sendEmail(
//       to,
//       subject,
//       wrapEmailTemplate(title, simpleNotificationBody(title, message)),
//     );
//   }

//   // ==================== Helper Methods ====================

//   /**
//    * Build booking email body
//    */
//   private buildBookingEmailBody(
//     booking: IRoomBooking,
//     headline: string,
//   ): string {
//     const checkInDate = new Date(booking.checkIn).toLocaleDateString("en-GB", {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//     const checkOutDate = new Date(booking.checkOut).toLocaleDateString(
//       "en-GB",
//       {
//         weekday: "long",
//         year: "numeric",
//         month: "long",
//         day: "numeric",
//       },
//     );

//     return `
//       <h2 style="margin:0 0 16px;color:#0F1D3A;">${headline}</h2>

//       <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
//         <tr><td style="padding:8px;background:#f5f5f5;"><strong>Booking #</strong></td><td style="padding:8px;">${booking.bookingNumber}</td></tr>
//         <tr><td style="padding:8px;"><strong>Guest</strong></td><td style="padding:8px;">${booking.guestName}</td></tr>
//         <tr><td style="padding:8px;background:#f5f5f5;"><strong>Room Type</strong></td><td style="padding:8px;">${booking.roomSnapshot.roomType}</td></tr>
//         <tr><td style="padding:8px;"><strong>Room Number</strong></td><td style="padding:8px;">${booking.roomSnapshot.roomNumber || "TBD"}</td></tr>
//         <tr><td style="padding:8px;background:#f5f5f5;"><strong>Check In</strong></td><td style="padding:8px;">${checkInDate}</td></tr>
//         <tr><td style="padding:8px;"><strong>Check Out</strong></td><td style="padding:8px;">${checkOutDate}</td></tr>
//         <tr><td style="padding:8px;background:#f5f5f5;"><strong>Nights</strong></td><td style="padding:8px;">${booking.nights}</td></tr>
//         <tr><td style="padding:8px;"><strong>Guests</strong></td><td style="padding:8px;">${booking.adults} Adults, ${booking.children} Children</td></tr>
//         <tr><td style="padding:8px;background:#f5f5f5;"><strong>Total Amount</strong></td><td style="padding:8px;font-weight:700;color:#F5A623;">₦${booking.priceBreakdown.total.toLocaleString()}</td></tr>
//         ${booking.specialRequests ? `<tr><td style="padding:8px;"><strong>Special Requests</strong></td><td style="padding:8px;">${booking.specialRequests}</td></tr>` : ""}
//       </table>

//       <p style="color:#555;font-size:14px;">Thank you for choosing Duban International Hotel!</p>
//     `;
//   }
// }

// // Export singleton instance
// export const notificationService = new NotificationService();
import {
  Notification,
  NotificationEvent,
  NotificationAudience,
} from "../Notifications/Notification.model";
import { IOrder } from "../../modules/MENU/models/Order.model";
import { IRoomBooking } from "../../modules/ROOMS/Booking.model";
import { generateMailTransporter } from "../../utilities/email.utils";
import {
  wrapEmailTemplate,
  orderEmailBody,
  simpleNotificationBody,
  paymentConfirmationBody,
  statusUpdateBody,
} from "./emailTemplates";

// ── Email transport ───────────────────────────────────────────────────────────

const transporter = generateMailTransporter();

const FROM_ADDRESS = `"${process.env.SMTP_FROM_NAME || "Duban International Hotel"}" <${process.env.SMTP_USER || process.env.EMAIL_USERNAME}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

// ── Status display labels ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed ✅",
  preparing: "Being Prepared 👨‍🍳",
  ready: "Ready for Pickup / Service 🍽️",
  served: "Served ✔️",
  cancelled: "Cancelled ❌",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending ⏳",
  confirmed: "Confirmed ✅",
  "checked-in": "Checked In 🏨",
  "checked-out": "Checked Out 🚪",
  cancelled: "Cancelled ❌",
  "no-show": "No Show ⚠️",
};

// ── Currency helper ───────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// ── Email sender ──────────────────────────────────────────────────────────────

const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> => {
  if (!process.env.SMTP_USER && !process.env.EMAIL_USERNAME) {
    console.warn("[Email] SMTP not configured — skipping email");
    return;
  }
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[Email] Failed to send:", err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  Notification Service
// ══════════════════════════════════════════════════════════════════════════════

class NotificationService {
  // ── Base helper ─────────────────────────────────────────────────────────────

  async createInAppNotification(opts: {
    event: NotificationEvent;
    title: string;
    message: string;
    recipients: NotificationAudience[];
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await Notification.create(opts);
    } catch (err) {
      console.error("[Notification] Failed to create:", err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RESTAURANT NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════

  async newOrder(order: IOrder): Promise<void> {
    const title = `New Order: ${order.orderNumber}`;
    const message = `${order.customerName} placed a ${order.orderType.replace("-", " ")} order worth ${fmt(order.total)}`;

    await this.createInAppNotification({
      event: "NEW_ORDER",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/orders/${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        orderType: order.orderType,
      },
    });

    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `🛎️ New Order Received — ${order.orderNumber}`,
        wrapEmailTemplate(
          title,
          orderEmailBody(
            order,
            `New ${order.orderType.replace("-", " ")} order received`,
            `From <strong>${order.customerName}</strong> (${order.customerPhone})`,
          ),
        ),
      );
    }

    const customerEmail = (order as any).customerEmail as string | undefined;
    if (customerEmail) {
      await sendEmail(
        customerEmail,
        `✅ Order Confirmed — ${order.orderNumber}`,
        wrapEmailTemplate(
          "Order Confirmation",
          orderEmailBody(
            order,
            "Thank you! Your order has been received.",
            `Track your order using ID: <strong>${order.guestId}</strong>`,
          ),
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async orderStatusChanged(
    order: IOrder,
    previousStatus: string,
  ): Promise<void> {
    const label = STATUS_LABELS[order.status] ?? order.status;
    const title = `Order ${order.orderNumber} — ${label}`;
    const message = `Status changed from "${previousStatus}" to "${order.status}"`;

    await this.createInAppNotification({
      event: "ORDER_STATUS_CHANGED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/orders/${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        previousStatus,
        newStatus: order.status,
      },
    });

    const notifyCustomerStatuses = [
      "confirmed",
      "ready",
      "served",
      "cancelled",
    ];
    const customerEmail = (order as any).customerEmail as string | undefined;

    if (customerEmail && notifyCustomerStatuses.includes(order.status)) {
      const subjectMap: Record<string, string> = {
        confirmed: `✅ Your order ${order.orderNumber} is confirmed!`,
        ready: `🍽️ Your order ${order.orderNumber} is ready!`,
        served: `✔️ Your order ${order.orderNumber} has been served`,
        cancelled: `❌ Your order ${order.orderNumber} has been cancelled`,
      };
      await sendEmail(
        customerEmail,
        subjectMap[order.status] ?? `Order ${order.orderNumber} — ${label}`,
        wrapEmailTemplate(
          "Order Status Update",
          statusUpdateBody(order, order.status, label),
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async paymentStatusChanged(
    order: IOrder,
    previousPaymentStatus: string,
  ): Promise<void> {
    const isPaid = order.paymentStatus === "paid";
    const title = `Payment ${isPaid ? "Received" : "Updated"} — ${order.orderNumber}`;
    const message = `Payment for order ${order.orderNumber} changed from "${previousPaymentStatus}" to "${order.paymentStatus}"${order.paymentMethod ? ` via ${order.paymentMethod}` : ""}`;

    await this.createInAppNotification({
      event: isPaid ? "PAYMENT_RECEIVED" : "PAYMENT_STATUS_CHANGED",
      title,
      message,
      recipients: ["admin"],
      actionUrl: `/orders/${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        previousPaymentStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
      },
    });

    if (isPaid && ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `💰 Payment Received — ${order.orderNumber}`,
        wrapEmailTemplate("Payment Received", paymentConfirmationBody(order)),
      );
    }

    const customerEmail = (order as any).customerEmail as string | undefined;
    if (customerEmail && isPaid) {
      await sendEmail(
        customerEmail,
        `💳 Payment Confirmed — ${order.orderNumber}`,
        wrapEmailTemplate(
          "Payment Confirmation",
          paymentConfirmationBody(order),
        ),
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HOTEL BOOKING NOTIFICATIONS
  //
  //  IRoomBooking field mapping (actual model → old wrong references):
  //    booking.bookingRef              ← was: booking.bookingNumber
  //    booking.roomSnapshot.category   ← was: booking.roomSnapshot.roomType
  //    booking.grandTotal              ← was: booking.priceBreakdown.total
  //    String(booking._id)             ← was: booking._id (unknown type)
  // ══════════════════════════════════════════════════════════════════════════

  async newBooking(booking: IRoomBooking): Promise<void> {
    const bookingId = String(booking._id);
    const title = `New Booking: ${booking.bookingRef}`;
    const message = `${booking.guestName} booked ${booking.roomSnapshot.category} (${booking.roomSnapshot.name}) for ${booking.nights} night${booking.nights !== 1 ? "s" : ""} — ${fmt(booking.grandTotal)}`;

    await this.createInAppNotification({
      event: "NEW_BOOKING",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        roomName: booking.roomSnapshot.name,
        roomNumber: booking.roomSnapshot.roomNumber,
        roomCategory: booking.roomSnapshot.category,
        bedType: booking.roomSnapshot.bedType,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        adults: booking.adults,
        children: booking.children,
        grandTotal: booking.grandTotal,
        depositAmount: booking.depositAmount,
        paymentMethod: booking.paymentMethod,
        source: booking.source,
      },
    });

    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `🏨 New Booking — ${booking.bookingRef}`,
        wrapEmailTemplate(
          title,
          this.buildBookingEmailBody(booking, "New Booking Received"),
        ),
      );
    }

    if (booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `✅ Booking Confirmed — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Booking Confirmation",
          this.buildBookingEmailBody(
            booking,
            "Thank you for choosing Duban International Hotel!",
          ),
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingConfirmed(booking: IRoomBooking): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Booking Confirmed: ${booking.bookingRef}`;
    const message = `${booking.guestName}'s booking has been confirmed`;

    await this.createInAppNotification({
      event: "BOOKING_CONFIRMED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      },
    });

    if (booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `✅ Booking Confirmed — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Booking Confirmation",
          this.buildBookingEmailBody(
            booking,
            "Your booking has been confirmed!",
          ),
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingCancelled(
    booking: IRoomBooking,
    reason?: string,
  ): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Booking Cancelled: ${booking.bookingRef}`;
    const message = reason
      ? `${booking.guestName}'s booking was cancelled: ${reason}`
      : `${booking.guestName}'s booking was cancelled`;

    await this.createInAppNotification({
      event: "BOOKING_CANCELLED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        cancelReason: reason || booking.cancelReason || "",
      },
    });

    if (booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `❌ Booking Cancelled — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Booking Cancelled",
          `<p>Dear ${booking.guestName},</p>
           <p>Your booking <strong>${booking.bookingRef}</strong> has been cancelled.</p>
           ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
           <p>If you have any questions, please contact us directly.</p>`,
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async guestCheckedIn(booking: IRoomBooking): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Guest Checked In: ${booking.bookingRef}`;
    const message = `${booking.guestName} has checked into room ${booking.roomSnapshot.roomNumber || booking.roomSnapshot.name}`;

    await this.createInAppNotification({
      event: "BOOKING_CHECKED_IN",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        roomNumber: booking.roomSnapshot.roomNumber,
        roomName: booking.roomSnapshot.name,
        checkedInAt: booking.checkedInAt,
        checkOut: booking.checkOut,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  async guestCheckedOut(booking: IRoomBooking): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Guest Checked Out: ${booking.bookingRef}`;
    const message = `${booking.guestName} has checked out from room ${booking.roomSnapshot.roomNumber || booking.roomSnapshot.name}`;

    await this.createInAppNotification({
      event: "BOOKING_CHECKED_OUT",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        roomNumber: booking.roomSnapshot.roomNumber,
        roomName: booking.roomSnapshot.name,
        checkedOutAt: booking.checkedOutAt,
        grandTotal: booking.grandTotal,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingModified(
    booking: IRoomBooking,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Booking Modified: ${booking.bookingRef}`;
    const message = `${booking.guestName}'s booking details have been updated`;

    await this.createInAppNotification({
      event: "BOOKING_MODIFIED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        changes,
      },
    });

    if (booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `📝 Booking Modified — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Booking Updated",
          `<p>Dear ${booking.guestName},</p>
           <p>Your booking <strong>${booking.bookingRef}</strong> has been modified.</p>
           <p>Please review your updated booking details or contact us for more information.</p>`,
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingPaymentReceived(
    booking: IRoomBooking,
    amount: number,
    method: string,
  ): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Payment Received: ${booking.bookingRef}`;
    const message = `Payment of ${fmt(amount)} received via ${method} for booking ${booking.bookingRef}`;

    await this.createInAppNotification({
      event: "BOOKING_PAYMENT_RECEIVED",
      title,
      message,
      recipients: ["admin"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        amount,
        paymentMethod: method,
        grandTotal: booking.grandTotal,
        paymentStatus: booking.paymentStatus,
      },
    });

    if (booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `💰 Payment Confirmed — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Payment Confirmation",
          `<h2>Payment Received ✅</h2>
           <p>Dear ${booking.guestName},</p>
           <p>Your payment of <strong>${fmt(amount)}</strong> for booking <strong>${booking.bookingRef}</strong> has been confirmed.</p>
           <p>Payment method: <strong>${method}</strong></p>
           <p>Thank you for choosing Duban International Hotel!</p>`,
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingPaymentUpdated(
    booking: IRoomBooking,
    previousPaymentStatus: string,
  ): Promise<void> {
    const bookingId = String(booking._id);
    const isPaid = booking.paymentStatus === "paid";
    const title = `Payment Updated: ${booking.bookingRef}`;
    const message = `Payment for ${booking.guestName}'s booking: ${previousPaymentStatus} → ${booking.paymentStatus} · ${fmt(booking.grandTotal)}`;

    await this.createInAppNotification({
      event: isPaid ? "BOOKING_PAYMENT_RECEIVED" : "BOOKING_PAYMENT_UPDATED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        previousPaymentStatus,
        newPaymentStatus: booking.paymentStatus,
        grandTotal: booking.grandTotal,
        paymentMethod: booking.paymentMethod,
        paymentNotes: booking.paymentNotes || undefined,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  async bookingReminder(
    booking: IRoomBooking,
    daysAhead: number,
  ): Promise<void> {
    const bookingId = String(booking._id);
    const title = `Upcoming Booking: ${booking.bookingRef}`;
    const message = `${booking.guestName} arrives in ${daysAhead} day${daysAhead !== 1 ? "s" : ""} (${new Date(booking.checkIn).toLocaleDateString("en-NG")})`;

    await this.createInAppNotification({
      event: "BOOKING_REMINDER",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: `/admin/bookings/${bookingId}`,
      metadata: {
        bookingId,
        bookingRef: booking.bookingRef,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        daysAhead,
        roomName: booking.roomSnapshot.name,
        roomNumber: booking.roomSnapshot.roomNumber,
      },
    });

    // Email reminder to guest (day-before only)
    if (daysAhead === 1 && booking.guestEmail) {
      await sendEmail(
        booking.guestEmail,
        `🔔 Your Stay Tomorrow — ${booking.bookingRef}`,
        wrapEmailTemplate(
          "Booking Reminder",
          `<p>Dear ${booking.guestName},</p>
           <p>This is a friendly reminder that you're checking in <strong>tomorrow</strong> at Duban International Hotel.</p>
           <table style="width:100%;border-collapse:collapse;margin:16px 0;">
             <tr><td style="padding:8px;background:#f5f5f5;"><strong>Booking Ref</strong></td><td style="padding:8px;">${booking.bookingRef}</td></tr>
             <tr><td style="padding:8px;"><strong>Room</strong></td><td style="padding:8px;">${booking.roomSnapshot.name} ${booking.roomSnapshot.roomNumber ? `(#${booking.roomSnapshot.roomNumber})` : ""}</td></tr>
             <tr><td style="padding:8px;background:#f5f5f5;"><strong>Check-in</strong></td><td style="padding:8px;">${new Date(booking.checkIn).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</td></tr>
             <tr><td style="padding:8px;"><strong>Check-out</strong></td><td style="padding:8px;">${new Date(booking.checkOut).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</td></tr>
           </table>
           <p>We look forward to welcoming you!</p>`,
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async roomAvailabilityChanged(
    roomNumber: string,
    status: string,
    date: Date,
  ): Promise<void> {
    const title = `Room ${roomNumber} Status Changed`;
    const message = `Room ${roomNumber} is now ${status} as of ${date.toLocaleDateString("en-NG")}`;

    await this.createInAppNotification({
      event: "ROOM_AVAILABILITY_CHANGED",
      title,
      message,
      recipients: ["admin", "staff"],
      actionUrl: "/admin/rooms",
      metadata: { roomNumber, status, date: date.toISOString() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  async sendCustomNotification(
    to: string,
    subject: string,
    title: string,
    message: string,
  ): Promise<void> {
    await sendEmail(
      to,
      subject,
      wrapEmailTemplate(title, simpleNotificationBody(title, message)),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════════════════════════════

  private buildBookingEmailBody(
    booking: IRoomBooking,
    headline: string,
  ): string {
    const fmtFullDate = (d: Date) =>
      new Date(d).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return `
      <h2 style="margin:0 0 16px;color:#0F1D3A;">${headline}</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Booking Ref</td>
          <td style="padding:8px;">${booking.bookingRef}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:600;">Guest Name</td>
          <td style="padding:8px;">${booking.guestName}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Room</td>
          <td style="padding:8px;">${booking.roomSnapshot.name}${booking.roomSnapshot.roomNumber ? ` (#${booking.roomSnapshot.roomNumber})` : ""}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:600;">Category</td>
          <td style="padding:8px;">${booking.roomSnapshot.category}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Bed Type</td>
          <td style="padding:8px;">${booking.roomSnapshot.bedType}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:600;">Check In</td>
          <td style="padding:8px;">${fmtFullDate(booking.checkIn)}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Check Out</td>
          <td style="padding:8px;">${fmtFullDate(booking.checkOut)}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:600;">Nights</td>
          <td style="padding:8px;">${booking.nights}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Guests</td>
          <td style="padding:8px;">${booking.adults} Adult${booking.adults !== 1 ? "s" : ""}${booking.children ? `, ${booking.children} Child${booking.children !== 1 ? "ren" : ""}` : ""}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:600;">Subtotal</td>
          <td style="padding:8px;">${fmt(booking.subtotal)}</td>
        </tr>
        ${
          booking.cleaningFee
            ? `
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Cleaning Fee</td>
          <td style="padding:8px;">${fmt(booking.cleaningFee)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:8px;font-weight:600;">VAT (7.5%)</td>
          <td style="padding:8px;">${fmt(booking.tax)}</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Service Charge</td>
          <td style="padding:8px;">${fmt(booking.serviceCharge)}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:700;font-size:15px;">Total Amount</td>
          <td style="padding:8px;font-weight:700;font-size:15px;color:#F5A623;">${fmt(booking.grandTotal)}</td>
        </tr>
        ${
          booking.depositAmount
            ? `
        <tr>
          <td style="padding:8px;background:#f5f5f5;font-weight:600;">Deposit Required</td>
          <td style="padding:8px;">${fmt(booking.depositAmount)}</td>
        </tr>`
            : ""
        }
        ${
          booking.specialRequests
            ? `
        <tr>
          <td style="padding:8px;font-weight:600;">Special Requests</td>
          <td style="padding:8px;">${booking.specialRequests}</td>
        </tr>`
            : ""
        }
      </table>

      <p style="color:#555;font-size:14px;">
        Thank you for choosing <strong>Duban International Hotel</strong>!
      </p>
    `;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
