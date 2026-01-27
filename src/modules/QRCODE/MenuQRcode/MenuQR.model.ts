import mongoose, { Document, model, Model, Schema } from "mongoose";

// Menu Item Interface
export interface IMenuItem {
  name: string;
  description?: string;
  shortCode?: string;
  price: number;
  currency: string;
  category: string;
  image?: string;
  available: boolean;
  dietary_info?: string[];
  allergens?: string[];
}

// Menu Category Interface
export interface IMenuCategory {
  name: string;
  description?: string;
  items: IMenuItem[];
  display_order: number;
}

// Styling Interface - Now properly typed
export interface IMenuStyling {
  primary_color: string;
  secondary_color: string;
  font_family: string;
  theme: "light" | "dark" | "auto";
  layout: "grid" | "list" | "compact";
}

// Contact Info Interface - Now properly typed
export interface IContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Business Hours Interface
export interface IBusinessHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

// Menu QR Document Interface - FIXED with required styling and contact_info
export interface MenuQRDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  business_name: string;
  business_logo?: string;
  shortCode: string;

  // Menu type
  menu_type:
    | "restaurant"
    | "catering"
    | "food_truck"
    | "cafe"
    | "bar"
    | "bakery"
    | "other";

  // Categories and items
  categories: IMenuCategory[];

  // QR Code settings
  qr_code_url: string;
  qr_code_image?: string;
  short_url?: string;

  // Styling options - NOW REQUIRED with default values
  styling: IMenuStyling;

  // Contact & Location - NOW REQUIRED (can be empty object)
  contact_info: IContactInfo;

  // Business hours
  business_hours?: IBusinessHours[];

  // Analytics
  scan_count: number;
  last_scanned_at?: Date;

  // Status
  is_active: boolean;
  is_public: boolean;

  // SEO
  meta_title?: string;
  meta_description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface MenuQRModel extends Model<MenuQRDocument> {}

const MenuItemSchema = new Schema<IMenuItem>({
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  shortCode: {
    type: String,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
  currency: {
    type: String,
    default: "USD",
    uppercase: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  available: {
    type: Boolean,
    default: true,
  },
  dietary_info: {
    type: [String],
    enum: [
      "vegetarian",
      "vegan",
      "gluten-free",
      "dairy-free",
      "halal",
      "kosher",
    ],
  },
  allergens: {
    type: [String],
  },
});

const MenuCategorySchema = new Schema<IMenuCategory>({
  name: {
    type: String,
    required: [true, "Category name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  items: [MenuItemSchema],
  display_order: {
    type: Number,
    default: 0,
  },
});

const MenuQRSchema = new Schema<MenuQRDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "IndividualUser",
      required: [true, "User ID is required"],
    },
    title: {
      type: String,
      required: [true, "Menu title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    business_name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    business_logo: {
      type: String,
    },
    menu_type: {
      type: String,
      enum: [
        "restaurant",
        "catering",
        "food_truck",
        "cafe",
        "bar",
        "bakery",
        "other",
      ],
      default: "restaurant",
    },
    categories: [MenuCategorySchema],
    qr_code_url: {
      type: String,
      required: [true, "QR code URL is required"],
    },
    qr_code_image: {
      type: String,
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      unique: true,
      trim: true,
      minlength: [6, "Short code too short"],
      index: true,
    },
    short_url: {
      type: String,
    },
    // FIXED: Now required with proper defaults
    styling: {
      type: {
        primary_color: {
          type: String,
          default: "#3B82F6",
        },
        secondary_color: {
          type: String,
          default: "#6B7280",
        },
        font_family: {
          type: String,
          default: "Inter",
        },
        theme: {
          type: String,
          enum: ["light", "dark", "auto"],
          default: "light",
        },
        layout: {
          type: String,
          enum: ["grid", "list", "compact"],
          default: "list",
        },
      },
      required: true,
      default: () => ({
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        font_family: "Inter",
        theme: "light",
        layout: "list",
      }),
    },
    // FIXED: Now required with proper defaults
    contact_info: {
      type: {
        phone: String,
        email: String,
        website: String,
        address: String,
        social_media: {
          facebook: String,
          instagram: String,
          twitter: String,
        },
      },
      required: true,
      default: () => ({}),
    },
    business_hours: [
      {
        day: {
          type: String,
          required: true,
        },
        open_time: String,
        close_time: String,
        is_closed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    scan_count: {
      type: Number,
      default: 0,
    },
    last_scanned_at: {
      type: Date,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_public: {
      type: Boolean,
      default: true,
    },
    meta_title: String,
    meta_description: String,
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
MenuQRSchema.index({ user_id: 1 });
MenuQRSchema.index({ qr_code_url: 1 });
MenuQRSchema.index({ short_url: 1 });
MenuQRSchema.index({ shortCode: 1 });
MenuQRSchema.index({ is_active: 1, is_public: 1 });

const MenuQR = model<MenuQRDocument, MenuQRModel>("MenuQR", MenuQRSchema);

export default MenuQR;
