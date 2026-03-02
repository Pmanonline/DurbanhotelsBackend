// import { IOrder } from "../MENU/models/Order.model";

// function getActiveProviders(): string[] {
//   const multi = process.env.WHATSAPP_PROVIDERS; // "callmebot,ultramsg"
//   const single = process.env.WHATSAPP_PROVIDER; // "callmebot"
//   if (multi) return multi.split(",").map((p) => p.trim().toLowerCase());
//   if (single) return [single.trim().toLowerCase()];
//   return ["callmebot"]; // default
// }

// // ── Formatters ────────────────────────────────────────────────────────────────

// const fmt = (n: number) =>
//   `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// function newOrderMessage(order: IOrder): string {
//   const itemLines = order.items
//     .map((i) => `  - ${i.name} x${i.quantity} = ${fmt(i.price * i.quantity)}`)
//     .join("\n");

//   return [
//     `NEW ORDER - ${order.orderNumber}`,
//     ``,
//     `Customer: ${order.customerName}`,
//     `Phone: ${order.customerPhone}`,
//     `Type: ${order.orderType.replace(/-/g, " ").toUpperCase()}`,
//     order.tableNumber ? `Table: ${order.tableNumber}` : null,
//     order.roomNumber ? `Room: ${order.roomNumber}` : null,
//     ``,
//     `Items:`,
//     itemLines,
//     ``,
//     `Subtotal: ${fmt(order.subtotal)}`,
//     `VAT (7.5%): ${fmt(order.tax)}`,
//     `Service (5%): ${fmt(order.serviceCharge)}`,
//     `TOTAL: ${fmt(order.total)}`,
//     order.specialRequests ? `Requests: ${order.specialRequests}` : null,
//     ``,
//     `Time: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`,
//   ]
//     .filter((l) => l !== null)
//     .join("\n");
// }

// function statusChangedMessage(order: IOrder, previousStatus: string): string {
//   const labels: Record<string, string> = {
//     confirmed: "CONFIRMED",
//     preparing: "PREPARING",
//     ready: "READY FOR SERVICE",
//     served: "SERVED",
//     cancelled: "CANCELLED",
//   };
//   return [
//     `ORDER UPDATE - ${order.orderNumber}`,
//     ``,
//     `Status: ${previousStatus.toUpperCase()} -> ${labels[order.status] ?? order.status.toUpperCase()}`,
//     `Customer: ${order.customerName} (${order.customerPhone})`,
//     `Total: ${fmt(order.total)}`,
//     `Time: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`,
//   ].join("\n");
// }

// function paymentMessage(order: IOrder, previousStatus: string): string {
//   const isPaid = order.paymentStatus === "paid";
//   return [
//     `PAYMENT ${isPaid ? "RECEIVED" : "UPDATED"} - ${order.orderNumber}`,
//     ``,
//     `Customer: ${order.customerName}`,
//     `Amount: ${fmt(order.total)}`,
//     `Method: ${order.paymentMethod ?? "N/A"}`,
//     `Status: ${previousStatus.toUpperCase()} -> ${order.paymentStatus.toUpperCase()}`,
//     `Time: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`,
//   ].join("\n");
// }

// // ── Logger helper ─────────────────────────────────────────────────────────────

// function log(
//   provider: string,
//   event: string,
//   status: "SENT" | "FAILED" | "SKIPPED",
//   detail?: string,
// ) {
//   const icon = status === "SENT" ? "✅" : status === "SKIPPED" ? "⚠️" : "❌";
//   console.log(
//     `[WhatsApp/${provider}] ${icon} ${status} | ${event} | ${new Date().toISOString()}${detail ? ` | ${detail}` : ""}`,
//   );
// }

// // ── CallMeBot ─────────────────────────────────────────────────────────────────

// async function sendViaCallMeBot(message: string, event: string): Promise<void> {
//   const rawPhone = process.env.WHATSAPP_ADMIN_PHONE ?? "";
//   const apiKey = process.env.WHATSAPP_API_KEY;

//   // CallMeBot needs plain digits — no +, no leading 00
//   const phone = rawPhone.replace(/^\+/, "").replace(/^00/, "");

//   if (!phone || !apiKey) {
//     log(
//       "CallMeBot",
//       event,
//       "SKIPPED",
//       "WHATSAPP_ADMIN_PHONE or WHATSAPP_API_KEY missing in .env",
//     );
//     return;
//   }

//   console.log(
//     `[WhatsApp/CallMeBot] Sending to phone=${phone}, apiKey=${apiKey.substring(0, 4)}****`,
//   );

//   const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
//   const res = await fetch(url);
//   const body = await res.text();
//   const clean = body
//     .replace(/<[^>]*>/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

//   console.log(
//     `[WhatsApp/CallMeBot] Raw response (HTTP ${res.status}): ${clean.substring(0, 200)}`,
//   );

//   if (!res.ok) throw new Error(`HTTP ${res.status} — ${clean}`);

//   if (
//     clean.toLowerCase().includes("apikey is invalid") ||
//     clean.toLowerCase().includes("invalid api")
//   ) {
//     throw new Error(
//       `Invalid API key. Go to callmebot.com to get a new key. Response: ${clean}`,
//     );
//   }

//   if (clean.toLowerCase().includes("error")) {
//     throw new Error(`CallMeBot error: ${clean}`);
//   }

//   log("CallMeBot", event, "SENT", `to=${phone}`);
// }

// // ── UltraMsg ──────────────────────────────────────────────────────────────────

// async function sendViaUltraMsg(message: string, event: string): Promise<void> {
//   const instance = process.env.ULTRAMSG_INSTANCE;
//   const token = process.env.ULTRAMSG_TOKEN;
//   const to = process.env.WHATSAPP_ADMIN_PHONE;

//   if (!instance || !token || !to) {
//     log(
//       "UltraMsg",
//       event,
//       "SKIPPED",
//       `Missing env vars — ULTRAMSG_INSTANCE=${instance ? "set" : "MISSING"}, ULTRAMSG_TOKEN=${token ? "set" : "MISSING"}, WHATSAPP_ADMIN_PHONE=${to ? "set" : "MISSING"}`,
//     );
//     return;
//   }

//   console.log(`[WhatsApp/UltraMsg] Sending to=${to}, instance=${instance}`);

//   const res = await fetch(
//     `https://api.ultramsg.com/${instance}/messages/chat`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({ token, to, body: message }).toString(),
//     },
//   );

//   const json = (await res.json()) as { sent?: string; error?: string };
//   console.log(
//     `[WhatsApp/UltraMsg] Raw response (HTTP ${res.status}):`,
//     JSON.stringify(json),
//   );

//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   if (json.error) throw new Error(`UltraMsg rejected: ${json.error}`);
//   if (json.sent !== "true" && json.sent !== (true as any)) {
//     throw new Error(`UltraMsg did not confirm send: ${JSON.stringify(json)}`);
//   }

//   log("UltraMsg", event, "SENT", `to=${to}`);
// }

// // ── Meta Cloud API ────────────────────────────────────────────────────────────

// async function sendViaMeta(message: string, event: string): Promise<void> {
//   const token = process.env.META_WHATSAPP_TOKEN;
//   const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
//   const to = process.env.WHATSAPP_ADMIN_PHONE;

//   if (!token || !phoneNumberId || !to) {
//     log(
//       "Meta",
//       event,
//       "SKIPPED",
//       "META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID or WHATSAPP_ADMIN_PHONE missing",
//     );
//     return;
//   }

//   const res = await fetch(
//     `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         messaging_product: "whatsapp",
//         to,
//         type: "text",
//         text: { body: message },
//       }),
//     },
//   );

//   const json = (await res.json()) as {
//     messages?: { id: string }[];
//     error?: { message: string };
//   };

//   if (!res.ok || json.error) {
//     throw new Error(`HTTP ${res.status} — ${json.error?.message ?? "unknown"}`);
//   }

//   log(
//     "Meta",
//     event,
//     "SENT",
//     `to=${to} | messageId=${json.messages?.[0]?.id ?? "unknown"}`,
//   );
// }

// // ── Per-provider dispatcher ───────────────────────────────────────────────────

// async function sendViaProvider(
//   provider: string,
//   message: string,
//   event: string,
// ): Promise<void> {
//   try {
//     switch (provider) {
//       case "callmebot":
//         await sendViaCallMeBot(message, event);
//         break;
//       case "ultramsg":
//         await sendViaUltraMsg(message, event);
//         break;
//       case "meta":
//         await sendViaMeta(message, event);
//         break;
//       default:
//         log(provider, event, "SKIPPED", `Unknown provider "${provider}"`);
//     }
//   } catch (err) {
//     const reason = err instanceof Error ? err.message : String(err);
//     log(provider, event, "FAILED", reason);
//     // Never throws — WhatsApp failures must never crash the order API
//   }
// }

// // ── Main dispatcher — fires ALL configured providers in parallel ──────────────

// async function send(message: string, event: string): Promise<void> {
//   const providers = getActiveProviders();
//   console.log(
//     `[WhatsApp] Firing event="${event}" via providers=[${providers.join(", ")}]`,
//   );
//   await Promise.allSettled(
//     providers.map((p) => sendViaProvider(p, message, event)),
//   );
// }

// // ── Public API ────────────────────────────────────────────────────────────────

// export const WhatsAppService = {
//   newOrder: (order: IOrder) =>
//     send(newOrderMessage(order), `NEW_ORDER:${order.orderNumber}`),

//   orderStatusChanged: (order: IOrder, previousStatus: string) =>
//     send(
//       statusChangedMessage(order, previousStatus),
//       `STATUS_CHANGE:${order.orderNumber}:${previousStatus}->${order.status}`,
//     ),

//   paymentStatusChanged: (order: IOrder, previousStatus: string) =>
//     send(
//       paymentMessage(order, previousStatus),
//       `PAYMENT_CHANGE:${order.orderNumber}:${previousStatus}->${order.paymentStatus}`,
//     ),
// };

import { IOrder } from "../MENU/models/Order.model";

// ─────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────

const fmt = (n: number) =>
  `₦${Number(n).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

function buildNewOrderMessage(order: IOrder): string {
  const items = order.items
    .map((i) => `- ${i.name} x${i.quantity} = ${fmt(i.price * i.quantity)}`)
    .join("\n");

  return `
🆕 *NEW ORDER* - ${order.orderNumber}

👤 Customer: ${order.customerName}
📞 Phone: ${order.customerPhone}
🏷️ Type: ${order.orderType}

Items:
${items}

💰 *TOTAL: ${fmt(order.total)}*

⏰ Time: ${new Date().toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
  })}
`.trim();
}

function buildStatusUpdateMessage(
  order: IOrder,
  previousStatus: string,
): string {
  const statusEmojis: Record<string, string> = {
    pending: "⏳",
    confirmed: "✅",
    preparing: "👨‍🍳",
    ready: "🍽️",
    served: "✔️",
    cancelled: "❌",
  };

  const emoji = statusEmojis[order.status] || "🔄";

  return `
${emoji} *ORDER STATUS UPDATED* - ${order.orderNumber}

From: ${previousStatus}
To: ${order.status}

👤 Customer: ${order.customerName}
💰 Total: ${fmt(order.total)}

⏰ Updated: ${new Date().toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
  })}
`.trim();
}

function buildPaymentUpdateMessage(
  order: IOrder,
  previousStatus: string,
): string {
  const isPaid = order.paymentStatus === "paid";
  const emoji = isPaid ? "💰" : "💳";

  return `
${emoji} *PAYMENT ${isPaid ? "RECEIVED" : "UPDATED"}* - ${order.orderNumber}

From: ${previousStatus}
To: ${order.paymentStatus}
${order.paymentMethod ? `Method: ${order.paymentMethod}` : ""}

👤 Customer: ${order.customerName}
💰 Amount: ${fmt(order.total)}

⏰ Updated: ${new Date().toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
  })}
`.trim();
}

// ─────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────

async function sendUltraMsg(message: string) {
  try {
    const res = await fetch(
      `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: process.env.ULTRAMSG_TOKEN!,
          to: process.env.WHATSAPP_ADMIN_PHONE!,
          body: message,
        }).toString(),
      },
    );

    const json = await res.json();
    if (!res.ok || json.error || json.sent !== "true") {
      throw new Error(JSON.stringify(json));
    }

    console.log("✅ UltraMsg sent");
  } catch (err) {
    console.error("❌ UltraMsg failed", err);
  }
}

async function sendCallMeBot(message: string) {
  try {
    const phone = process.env
      .WHATSAPP_ADMIN_PHONE!.replace(/^\+/, "")
      .replace(/^00/, "");

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(
      message,
    )}&apikey=${process.env.WHATSAPP_API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) throw new Error(await res.text());

    console.log("✅ CallMeBot sent");
  } catch (err) {
    console.error("❌ CallMeBot failed", err);
  }
}

async function sendMeta(message: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: process.env.WHATSAPP_ADMIN_PHONE,
          type: "text",
          text: { body: message },
        }),
      },
    );

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(JSON.stringify(json));
    }

    console.log("✅ Meta sent");
  } catch (err) {
    console.error("❌ Meta failed", err);
  }
}

// ─────────────────────────────────────────────
// BROADCAST (ALL providers, no waiting)
// ─────────────────────────────────────────────

function broadcast(message: string) {
  // Fire all without await
  sendUltraMsg(message);
  sendCallMeBot(message);
  sendMeta(message);
}

// ─────────────────────────────────────────────
// Public API - Complete Service
// ─────────────────────────────────────────────

export const WhatsAppService = {
  /**
   * Send notification for new order
   */
  newOrder(order: IOrder) {
    const message = buildNewOrderMessage(order);
    broadcast(message);
  },

  /**
   * Send notification for order status change
   */
  orderStatusChanged(order: IOrder, previousStatus: string) {
    const message = buildStatusUpdateMessage(order, previousStatus);
    broadcast(message);
  },

  /**
   * Send notification for payment status change
   */
  paymentStatusChanged(order: IOrder, previousStatus: string) {
    const message = buildPaymentUpdateMessage(order, previousStatus);
    broadcast(message);
  },
};
