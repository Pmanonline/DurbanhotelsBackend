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

// QR Design Styling Interface - NEW
export interface IQRDesignStyling {
  // Template & Shape
  qr_template?: "classic" | "rounded" | "dots" | "heart" | "star" | "diamond";
  dot_style?: "square" | "rounded" | "dots" | "heart" | "star" | "diamond";
  corner_style?: "square" | "rounded" | "dot" | "heart" | "star" | "diamond";

  // Frame
  frame?:
    | "none"
    | "thin"
    | "thick"
    | "shadow"
    | "rounded"
    | "pattern"
    | "14feb"
    | "baby";
  frame_color?: string;
  frame_text?: string;

  // Colors & Patterns
  body_pattern?: "single" | "gradient" | "transparent";
  qr_primary_color?: string;
  qr_secondary_color?: string;
  qr_background_color?: string;
  gradient_type?: "linear" | "radial";
  gradient_rotation?: number;

  // Logo/Image
  logo_image?: string;
  logo_size?: "small" | "medium" | "large";
  logo_style?: "square" | "rounded" | "circle";

  // Advanced
  error_correction?: "L" | "M" | "Q" | "H"; // Low, Medium, Quartile, High
  margin?: number; // 0-10
  qr_size?: number; // 300-2000px
}

// Menu Styling Interface - Updated
export interface IMenuStyling {
  primary_color: string;
  secondary_color: string;
  font_family: string;
  font_size?: "small" | "medium" | "large" | "xl";
  font_weight?: "light" | "regular" | "medium" | "semibold" | "bold";
  letter_spacing?: "tight" | "normal" | "wide" | "wider";
  theme: "light" | "dark" | "auto";
  layout: "grid" | "list" | "compact";

  // QR Design Styling - NEW
  qr_design?: IQRDesignStyling;
}

// Contact Info Interface
export interface IContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
}

// Business Hours Interface
export interface IBusinessHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

// Menu QR Document Interface - Updated
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

  // Enhanced styling with QR design
  styling: IMenuStyling;

  // Contact & Location
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

// QR Design Styling Schema - NEW
const QRDesignStylingSchema = new Schema<IQRDesignStyling>(
  {
    // Template & Shape
    qr_template: {
      type: String,
      enum: ["classic", "rounded", "dots", "heart", "star", "diamond"],
      default: "classic",
    },
    dot_style: {
      type: String,
      enum: ["square", "rounded", "dots", "heart", "star", "diamond"],
      default: "square",
    },
    corner_style: {
      type: String,
      enum: ["square", "rounded", "dot", "heart", "star", "diamond"],
      default: "square",
    },

    // Frame
    frame: {
      type: String,
      enum: [
        "none",
        "thin",
        "thick",
        "shadow",
        "rounded",
        "pattern",
        "14feb",
        "baby",
      ],
      default: "none",
    },
    frame_color: {
      type: String,
      default: "#000000",
    },
    frame_text: {
      type: String,
      maxlength: 50,
    },

    // Colors & Patterns
    body_pattern: {
      type: String,
      enum: ["single", "gradient", "transparent"],
      default: "single",
    },
    qr_primary_color: {
      type: String,
      default: "#000000",
    },
    qr_secondary_color: {
      type: String,
      default: "#000000",
    },
    qr_background_color: {
      type: String,
      default: "#FFFFFF",
    },
    gradient_type: {
      type: String,
      enum: ["linear", "radial"],
      default: "linear",
    },
    gradient_rotation: {
      type: Number,
      min: 0,
      max: 360,
      default: 0,
    },

    // Logo/Image
    logo_image: {
      type: String,
    },
    logo_size: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    logo_style: {
      type: String,
      enum: ["square", "rounded", "circle"],
      default: "rounded",
    },

    // Advanced
    error_correction: {
      type: String,
      enum: ["L", "M", "Q", "H"],
      default: "M",
    },
    margin: {
      type: Number,
      min: 0,
      max: 10,
      default: 2,
    },
    qr_size: {
      type: Number,
      min: 300,
      max: 2000,
      default: 1000,
    },
  },
  { _id: false },
);

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
    // Enhanced styling with QR design
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
        font_size: {
          type: String,
          enum: ["small", "medium", "large", "xl"],
          default: "medium",
        },
        font_weight: {
          type: String,
          enum: ["light", "regular", "medium", "semibold", "bold"],
          default: "regular",
        },
        letter_spacing: {
          type: String,
          enum: ["tight", "normal", "wide", "wider"],
          default: "normal",
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
        // QR Design Styling - NEW
        qr_design: {
          type: QRDesignStylingSchema,
          default: () => ({
            qr_template: "classic",
            dot_style: "square",
            corner_style: "square",
            frame: "none",
            body_pattern: "single",
            qr_primary_color: "#000000",
            qr_secondary_color: "#000000",
            qr_background_color: "#FFFFFF",
            error_correction: "M",
            margin: 2,
            qr_size: 1000,
          }),
        },
      },
      required: true,
      default: () => ({
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        font_family: "Inter",
        font_size: "medium",
        font_weight: "regular",
        letter_spacing: "normal",
        theme: "light",
        layout: "list",
        qr_design: {
          qr_template: "classic",
          dot_style: "square",
          corner_style: "square",
          frame: "none",
          body_pattern: "single",
          qr_primary_color: "#000000",
          qr_secondary_color: "#000000",
          qr_background_color: "#FFFFFF",
          error_correction: "M",
          margin: 2,
          qr_size: 1000,
        },
      }),
    },
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
          linkedin: String,
          tiktok: String,
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
