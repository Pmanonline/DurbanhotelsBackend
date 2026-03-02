import { Schema, model, Document, Types } from "mongoose";

export interface IRoomBooking extends Document {
  // Reference
  room: Types.ObjectId;
  roomSnapshot: {
    // snapshot at booking time (price/name may change later)
    name: string;
    slug: string;
    roomNumber: string;
    category: string;
    pricePerNight: number;
    bedType: string;
    maxGuests: number;
  };

  // Booking window
  checkIn: Date;
  checkOut: Date;
  nights: number; // computed on save

  // Guests
  adults: number;
  children: number;
  totalGuests: number; // adults + children
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests: string;

  // Rooms booked (same type)
  roomCount: number;

  // Pricing breakdown
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  tax: number;
  serviceCharge: number;
  depositAmount: number;
  total: number;
  grandTotal: number;

  // Extras selected
  selectedExtras: Array<{ label: string; price: number }>;

  // Payment
  paymentStatus:
    | "unpaid"
    | "deposit_paid"
    | "paid"
    | "refunded"
    | "partially-refunded";
  paymentMethod: "cash" | "card" | "bank-transfer" | "room-charge";
  paymentNotes: string;

  // Booking status
  status:
    | "pending"
    | "confirmed"
    | "checked-in"
    | "checked-out"
    | "cancelled"
    | "no-show";
  cancelledAt: Date | null;
  cancelReason: string;
  confirmedAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;

  // Tracking
  bookingRef: string; // e.g. "BK-20260227-AB3X"
  source: string; // "website" | "walk-in" | "phone" | "ota"
  createdBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const RoomBookingSchema = new Schema<IRoomBooking>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    roomSnapshot: {
      name: { type: String, default: "" },
      slug: { type: String, default: "" },
      roomNumber: { type: String, default: "" },
      category: { type: String, default: "" },
      pricePerNight: { type: Number, default: 0 },
      bedType: { type: String, default: "" },
      maxGuests: { type: Number, default: 2 },
    },

    // ── Booking window
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, default: 1 },

    // ── Guests
    adults: { type: Number, required: true, min: 1, default: 1 },
    children: { type: Number, min: 0, default: 0 },
    totalGuests: { type: Number, default: 1 },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    guestEmail: { type: String, trim: true, lowercase: true, default: "" },
    specialRequests: { type: String, default: "" },

    roomCount: { type: Number, default: 1, min: 1 },

    // ── Pricing
    pricePerNight: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    cleaningFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    total: { type: Number, required: true }, // subtotal + fees (pre-tax)
    grandTotal: { type: Number, required: true }, // everything

    selectedExtras: [
      {
        label: { type: String },
        price: { type: Number, default: 0 },
        _id: false,
      },
    ],

    // ── Payment
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "deposit_paid",
        "paid",
        "refunded",
        "partially-refunded",
      ],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank-transfer", "room-charge"],
      default: "cash",
    },
    paymentNotes: { type: String, default: "" },

    // ── Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked-in",
        "checked-out",
        "cancelled",
        "no-show",
      ],
      default: "pending",
    },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },

    // ── Tracking
    bookingRef: { type: String, unique: true },
    source: {
      type: String,
      enum: ["website", "walk-in", "phone", "ota"],
      default: "website",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// ── Indexes
RoomBookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
RoomBookingSchema.index({ guestPhone: 1 });
RoomBookingSchema.index({ guestEmail: 1 });
RoomBookingSchema.index({ status: 1 });
RoomBookingSchema.index({ bookingRef: 1 }, { unique: true });
RoomBookingSchema.index({ checkIn: 1, checkOut: 1 });

// ── Pre-save: auto-compute nights and totalGuests
RoomBookingSchema.pre("save", function (next) {
  const ms = this.checkOut.getTime() - this.checkIn.getTime();
  this.nights = Math.max(1, Math.ceil(ms / 86400000));
  this.totalGuests = this.adults + (this.children || 0);
  next();
});

export const RoomBooking = model<IRoomBooking>(
  "RoomBooking",
  RoomBookingSchema,
);
