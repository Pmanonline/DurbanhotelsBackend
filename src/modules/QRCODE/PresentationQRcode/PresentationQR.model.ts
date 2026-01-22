import mongoose, { Document, model, Model, Schema } from "mongoose";

// Presentation Page/Slide Interface
export interface IPresentationPage {
  page_number: number;
  title?: string;
  content?: string;
  image_url?: string;
  pdf_page_url?: string;
  notes?: string;
}

// Presentation QR Document Interface
export interface PresentationQRDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;

  // Basic info
  title: string;
  description?: string;

  // Presentation type
  presentation_type:
    | "brochure"
    | "announcement"
    | "magazine"
    | "event_program"
    | "project_presentation"
    | "analytics_report"
    | "catalog"
    | "menu"
    | "other";

  // File information
  file_url?: string; // PDF or images ZIP
  file_type: "pdf" | "images" | "mixed";
  file_size?: number;
  total_pages: number;

  // Pages/Slides
  pages: IPresentationPage[];

  // Viewer settings
  viewer_settings: {
    view_mode: "sliding" | "tabbing" | "flipbook" | "scroll" | "grid";
    theme: "light" | "dark" | "auto";
    enable_download: boolean;
    enable_sharing: boolean;
    enable_fullscreen: boolean;
    autoplay: boolean;
    autoplay_delay?: number; // in seconds
    show_page_numbers: boolean;
    show_navigation: boolean;
  };

  // Styling
  styling: {
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    background_color?: string;
  };

  // QR Code settings
  qr_code_url: string;
  qr_code_image?: string;
  short_url?: string;

  // Branding
  branding?: {
    company_name?: string;
    company_logo?: string;
    watermark?: string;
    footer_text?: string;
  };

  // Access control
  access_settings: {
    is_public: boolean;
    requires_password: boolean;
    password?: string;
    expiry_date?: Date;
    max_views?: number;
    current_views: number;
  };

  // Analytics
  scan_count: number;
  view_count: number;
  last_viewed_at?: Date;
  page_views: Map<number, number>; // page_number -> view_count

  // Metadata
  tags?: string[];
  category?: string;

  // Status
  is_active: boolean;

  // SEO
  meta_title?: string;
  meta_description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationQRModel extends Model<PresentationQRDocument> {}

const PresentationPageSchema = new Schema<IPresentationPage>({
  page_number: {
    type: Number,
    required: true,
  },
  title: String,
  content: String,
  image_url: String,
  pdf_page_url: String,
  notes: String,
});

const PresentationQRSchema = new Schema<PresentationQRDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "IndividualUser",
      required: [true, "User ID is required"],
    },
    title: {
      type: String,
      required: [true, "Presentation title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    presentation_type: {
      type: String,
      enum: [
        "brochure",
        "announcement",
        "magazine",
        "event_program",
        "project_presentation",
        "analytics_report",
        "catalog",
        "menu",
        "other",
      ],
      required: [true, "Presentation type is required"],
    },
    file_url: String,
    file_type: {
      type: String,
      enum: ["pdf", "images", "mixed"],
      required: [true, "File type is required"],
    },
    file_size: Number,
    total_pages: {
      type: Number,
      required: [true, "Total pages is required"],
      min: [1, "Must have at least 1 page"],
    },
    pages: [PresentationPageSchema],
    viewer_settings: {
      view_mode: {
        type: String,
        enum: ["sliding", "tabbing", "flipbook", "scroll", "grid"],
        default: "sliding",
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      enable_download: {
        type: Boolean,
        default: false,
      },
      enable_sharing: {
        type: Boolean,
        default: true,
      },
      enable_fullscreen: {
        type: Boolean,
        default: true,
      },
      autoplay: {
        type: Boolean,
        default: false,
      },
      autoplay_delay: {
        type: Number,
        default: 5,
        min: [1, "Autoplay delay must be at least 1 second"],
      },
      show_page_numbers: {
        type: Boolean,
        default: true,
      },
      show_navigation: {
        type: Boolean,
        default: true,
      },
    },
    styling: {
      primary_color: {
        type: String,
        default: "#007bff",
      },
      secondary_color: {
        type: String,
        default: "#6c757d",
      },
      font_family: {
        type: String,
        default: "Arial",
      },
      background_color: {
        type: String,
        default: "#ffffff",
      },
    },
    qr_code_url: {
      type: String,
      required: [true, "QR code URL is required"],
      unique: true,
    },
    qr_code_image: String,
    short_url: String,
    branding: {
      company_name: String,
      company_logo: String,
      watermark: String,
      footer_text: String,
    },
    access_settings: {
      is_public: {
        type: Boolean,
        default: true,
      },
      requires_password: {
        type: Boolean,
        default: false,
      },
      password: {
        type: String,
        select: false,
      },
      expiry_date: Date,
      max_views: Number,
      current_views: {
        type: Number,
        default: 0,
      },
    },
    scan_count: {
      type: Number,
      default: 0,
    },
    view_count: {
      type: Number,
      default: 0,
    },
    last_viewed_at: Date,
    page_views: {
      type: Map,
      of: Number,
      default: {},
    },
    tags: [String],
    category: String,
    is_active: {
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

// Indexes for performance
PresentationQRSchema.index({ user_id: 1 });
PresentationQRSchema.index({ qr_code_url: 1 });
PresentationQRSchema.index({ short_url: 1 });
PresentationQRSchema.index({ is_active: 1 });
PresentationQRSchema.index({ presentation_type: 1 });
PresentationQRSchema.index({ "access_settings.is_public": 1 });

const PresentationQR = model<PresentationQRDocument, PresentationQRModel>(
  "PresentationQR",
  PresentationQRSchema,
);

export default PresentationQR;
