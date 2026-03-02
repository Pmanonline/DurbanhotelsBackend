import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface IOrder extends Document<Types.ObjectId> {
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  orderType: "room-service" | "dine-in" | "takeaway";
  tableNumber?: string;
  roomNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialRequests?: string;
  paymentMethod?: "cash" | "card" | "bank-transfer" | "room-charge";
  paymentStatus: "unpaid" | "paid" | "partially-paid";
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "served"
    | "cancelled";
  guestId: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a unique order number: ORD-YYYYMMDD-XXXXX
 *  e.g. ORD-20250225-A3K9F
 *  Uses Date.now() + random suffix → collision probability is negligible.
 */
function generateOrderNumber(): string {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${datePart}-${rand}`;
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String, default: "" },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    // ── NEW: orderNumber ──────────────────────────────────────────────────────
    // unique:true is kept so duplicate detection still works at DB level,
    // but we now always generate a value — null can never be inserted.
    orderNumber: {
      type: String,
      unique: true,
      // Default runs at document creation time, so every insert gets a value.
      default: generateOrderNumber,
    },

    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    serviceCharge: { type: Number, required: true },
    total: { type: Number, required: true },
    orderType: {
      type: String,
      enum: ["room-service", "dine-in", "takeaway"],
      required: true,
    },
    tableNumber: String,
    roomNumber: String,
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    specialRequests: String,
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank-transfer", "room-charge"],
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partially-paid"],
      default: "unpaid",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "pending",
    },
    guestId: { type: String, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ customerPhone: 1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true }); // explicit — replaces the stale one

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
