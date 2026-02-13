"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MenuItemSchema = new mongoose_1.Schema({
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
const MenuCategorySchema = new mongoose_1.Schema({
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
const QRDesignStylingSchema = new mongoose_1.Schema({
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
}, { _id: false });
const MenuQRSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
// Indexes for better query performance
MenuQRSchema.index({ user_id: 1 });
MenuQRSchema.index({ qr_code_url: 1 });
MenuQRSchema.index({ short_url: 1 });
MenuQRSchema.index({ shortCode: 1 });
MenuQRSchema.index({ is_active: 1, is_public: 1 });
const MenuQR = (0, mongoose_1.model)("MenuQR", MenuQRSchema);
exports.default = MenuQR;
