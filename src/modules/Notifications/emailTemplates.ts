// templates/emailTemplates.ts
import { IOrder } from "../../modules/MENU/models/Order.model";

/**
 * Base wrapper for all emails
 * Provides consistent branding and layout
 */
export const wrapEmailTemplate = (title: string, body: string): string => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <!-- Header with Duban Hotel branding -->
            <tr>
              <td style="background:#0F1D3A;padding:24px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
                  <span style="color:#F5A623;">DUBAN</span> INTERNATIONAL HOTEL
                </h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                ${body}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
                <p style="margin:0 0 8px;color:#999;font-size:12px;">
                  61-63 Ogunnusi Road, Ogba, Ikeja, Lagos
                </p>
                <p style="margin:0;color:#999;font-size:12px;">
                  This is an automated notification. Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

/**
 * Order details table generator
 */
const generateOrderTable = (order: IOrder): string => {
  const itemRows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${i.name}${i.specialInstructions ? `<br/><small style="color:#888">${i.specialInstructions}</small>` : ""}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">₦${(i.price * i.quantity).toLocaleString()}</td>
      </tr>`,
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;font-size:13px;color:#555;">Item</th>
          <th style="padding:8px;text-align:center;font-size:13px;color:#555;">Qty</th>
          <th style="padding:8px;text-align:right;font-size:13px;color:#555;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>`;
};

/**
 * Order summary with totals
 */
const generateOrderSummary = (order: IOrder): string => {
  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:4px 0;color:#555;font-size:14px;">Subtotal</td>
        <td style="padding:4px 0;text-align:right;font-size:14px;">₦${order.subtotal.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#555;font-size:14px;">VAT (7.5%)</td>
        <td style="padding:4px 0;text-align:right;font-size:14px;">₦${order.tax.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#555;font-size:14px;">Service Charge (5%)</td>
        <td style="padding:4px 0;text-align:right;font-size:14px;">₦${order.serviceCharge.toLocaleString()}</td>
      </tr>
      <tr style="border-top:2px solid #0F1D3A;">
        <td style="padding:8px 0;font-weight:700;color:#0F1D3A;font-size:15px;">Total</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;color:#0F1D3A;font-size:15px;">₦${order.total.toLocaleString()}</td>
      </tr>
    </table>`;
};

/**
 * Order customer information
 */
const generateCustomerInfo = (order: IOrder): string => {
  return `
    <table style="width:100%;border-collapse:collapse;background:#f9f9f9;border-radius:6px;padding:12px;">
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#555;"><strong>Order #</strong></td>
        <td style="padding:6px 12px;font-size:13px;">${order.orderNumber}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#555;"><strong>Type</strong></td>
        <td style="padding:6px 12px;font-size:13px;text-transform:capitalize;">${order.orderType.replace("-", " ")}</td>
      </tr>
      ${order.tableNumber ? `<tr><td style="padding:6px 12px;font-size:13px;color:#555;"><strong>Table</strong></td><td style="padding:6px 12px;font-size:13px;">${order.tableNumber}</td></tr>` : ""}
      ${order.roomNumber ? `<tr><td style="padding:6px 12px;font-size:13px;color:#555;"><strong>Room</strong></td><td style="padding:6px 12px;font-size:13px;">${order.roomNumber}</td></tr>` : ""}
      ${order.specialRequests ? `<tr><td style="padding:6px 12px;font-size:13px;color:#555;"><strong>Special Requests</strong></td><td style="padding:6px 12px;font-size:13px;">${order.specialRequests}</td></tr>` : ""}
    </table>`;
};

/**
 * Complete order email body
 */
export const orderEmailBody = (
  order: IOrder,
  headline: string,
  extra = "",
): string => {
  return `
    <h2 style="margin:0 0 8px;color:#0F1D3A;font-size:18px;">${headline}</h2>
    <p style="margin:0 0 24px;color:#555;font-size:14px;">${extra}</p>

    ${generateOrderTable(order)}
    ${generateOrderSummary(order)}
    ${generateCustomerInfo(order)}`;
};

/**
 * Simple notification email body
 */
export const simpleNotificationBody = (
  title: string,
  message: string,
): string => {
  return `
    <h2 style="margin:0 0 16px;color:#0F1D3A;font-size:18px;">${title}</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;">${message}</p>
    <p style="margin:0;color:#F5A623;font-size:12px;">Duban International Hotel</p>`;
};

/**
 * Payment confirmation email
 */
export const paymentConfirmationBody = (order: IOrder): string => {
  return `
    <h2 style="margin:0 0 16px;color:#0F1D3A;font-size:18px;">Payment Confirmed ✅</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;">
      Your payment has been received for order <strong>${order.orderNumber}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#f9f9f9;border-radius:6px;margin-top:16px;">
      <tr><td style="padding:8px 12px;font-size:13px;color:#555;"><strong>Amount</strong></td><td style="padding:8px 12px;">₦${order.total.toLocaleString()}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#555;"><strong>Method</strong></td><td style="padding:8px 12px;text-transform:capitalize;">${order.paymentMethod ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#555;"><strong>Order Number</strong></td><td style="padding:8px 12px;">${order.orderNumber}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#F5A623;font-size:12px;">Thank you for choosing Duban International Hotel!</p>`;
};

/**
 * Status update email
 */
export const statusUpdateBody = (
  order: IOrder,
  status: string,
  label: string,
): string => {
  return `
    <h2 style="margin:0 0 8px;color:#0F1D3A;font-size:18px;">${label}</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;">
      Your order <strong>${order.orderNumber}</strong> status has been updated to <strong>${order.status}</strong>.
    </p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;">
      Track your order with ID: <strong>${order.guestId}</strong>
    </p>
    <p style="margin:0;color:#F5A623;font-size:12px;">Duban International Hotel</p>`;
};

// In emailTemplates.ts, add this function

// export const bookingEmailBody = (
//   booking: IBooking,
//   headline: string,
//   extra = "",
// ): string => {
//   return `
//     <h2 style="margin:0 0 8px;color:#0F1D3A;font-size:18px;">${headline}</h2>
//     <p style="margin:0 0 24px;color:#555;font-size:14px;">${extra}</p>

//     <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Booking #</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${booking.bookingNumber}</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Guest</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${booking.guestName}</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Room</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${booking.roomType} (${booking.roomNumber || "TBD"})</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Check In</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${new Date(booking.checkIn).toLocaleDateString()}</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Check Out</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${new Date(booking.checkOut).toLocaleDateString()}</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Nights</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${booking.nights}</td>
//       </tr>
//       <tr>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;"><strong>Total</strong></td>
//         <td style="padding:8px;border-bottom:1px solid #f0f0f0;font-weight:700;color:#F5A623;">₦${booking.totalAmount?.toLocaleString()}</td>
//       </tr>
//     </table>`;
// };
