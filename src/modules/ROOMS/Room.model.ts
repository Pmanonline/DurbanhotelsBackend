import { Schema, model, Document } from "mongoose";

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const AmenitySchema = new Schema(
  {
    label: { type: String, required: true },
    icon: { type: String, default: "" }, // icon key: "FaWifi", "FaSnowflake" etc
    category: {
      type: String,
      enum: [
        "comfort",
        "technology",
        "bathroom",
        "service",
        "fitness",
        "dining",
      ],
      default: "comfort",
    },
  },
  { _id: false },
);

const ExtraServiceSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, default: 0 },
    note: { type: String, default: "" },
    isFree: { type: Boolean, default: false },
  },
  { _id: false },
);

const PricingTierSchema = new Schema(
  {
    label: { type: String, required: true }, // "Weekday", "Weekend", "Holiday"
    price: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false },
);

// ── Main Room Interface ───────────────────────────────────────────────────────

export interface IRoom extends Document {
  // Identity
  slug: string;
  name: string; // e.g. "315", "GREEN - 306", "AC MILAN - 101"
  displayName?: string; // Full display name like "AC MILAN - 101"
  category:
    | "Executive"
    | "Annex - Classic"
    | "Imperial Suite"
    | "Annex - Studio"
    | "Deluxe"
    | "Superior Twin";
  roomNumber: string;
  floor: number;

  // Capacity
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  minNights: number;
  maxNights: number;

  // Room specs
  size: string;
  sizeValue: number;
  view: string;
  bedType: string;
  bedCount: number;
  bathrooms: number;
  smokingAllowed: boolean;
  petFriendly: boolean;
  accessible: boolean;

  // Pricing
  pricePerNight: number;
  pricingTiers: Array<{
    label: string;
    price: number;
    startDate?: Date;
    endDate?: Date;
  }>;
  depositAmount: number;
  depositPercent: number;
  holdHours: number;
  cleaningFee: number;
  taxRate: number;
  serviceChargeRate: number;

  // Content
  description: string;
  longDescription: string;
  images: string[];
  thumbnailImage: string;

  // Amenities
  amenities: Array<{ label: string; icon: string; category: string }>;
  fullAmenities: Array<{ label: string; icon: string; category: string }>;
  includes: string[];
  extraServices: Array<{
    label: string;
    price: number;
    note: string;
    isFree: boolean;
  }>;

  // Availability
  isAvailable: boolean;
  isPublished: boolean;
  status: "available" | "occupied" | "maintenance" | "reserved";
  unavailableDates: Date[];

  // Meta
  rating: number;
  reviewCount: number;
  tags: string[];
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const RoomSchema = new Schema<IRoom>(
  {
    // ── Identity
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Executive",
        "Annex - Classic",
        "Imperial Suite",
        "Annex - Studio",
        "Deluxe",
        "Superior Twin",
      ],
      default: "Executive",
    },
    roomNumber: { type: String, default: "", trim: true },
    floor: { type: Number, default: 1 },

    // ── Capacity
    maxGuests: { type: Number, required: true, min: 1, default: 2 },
    maxAdults: { type: Number, required: true, min: 1, default: 2 },
    maxChildren: { type: Number, min: 0, default: 0 },
    minNights: { type: Number, min: 1, default: 1 },
    maxNights: { type: Number, min: 0, default: 0 }, // 0 = unlimited

    // ── Room specs
    size: { type: String, default: "" }, // "35 m²"
    sizeValue: { type: Number, default: 0 }, // 35 (numeric for sort/filter)
    view: { type: String, default: "" }, // "City View"
    bedType: {
      type: String,
      required: true,
      enum: ["Single", "Double", "Queen", "King", "Twin", "Bunk"],
      default: "Queen",
    },
    bedCount: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    smokingAllowed: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    accessible: { type: Boolean, default: false },

    // ── Pricing
    pricePerNight: { type: Number, required: true, min: 0 },
    pricingTiers: [PricingTierSchema],
    depositAmount: { type: Number, default: 0 },
    depositPercent: { type: Number, default: 0, min: 0, max: 100 },
    holdHours: { type: Number, default: 4 },
    cleaningFee: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0.075 }, // 7.5%
    serviceChargeRate: { type: Number, default: 0.05 }, // 5%

    // ── Content
    description: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    images: [{ type: String }],
    thumbnailImage: { type: String, default: "" },

    // ── Amenities
    amenities: [AmenitySchema],
    fullAmenities: [AmenitySchema],
    includes: [{ type: String }],
    extraServices: [ExtraServiceSchema],

    // ── Availability & status
    isAvailable: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "reserved"],
      default: "available",
    },
    unavailableDates: [{ type: Date }],

    // ── Meta
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
RoomSchema.index({ slug: 1 }, { unique: true });
RoomSchema.index({ category: 1, isPublished: 1, isAvailable: 1 });
RoomSchema.index({ pricePerNight: 1 });
RoomSchema.index({ maxGuests: 1 });
RoomSchema.index({ rating: -1 });
RoomSchema.index({ status: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
RoomSchema.virtual("priceFormatted").get(function (this: IRoom) {
  return `₦${this.pricePerNight.toLocaleString("en-NG")}`;
});

RoomSchema.virtual("link").get(function (this: IRoom) {
  return `/rooms/roomdetail/${this.slug}`;
});

export const Room = model<IRoom>("Room", RoomSchema);
