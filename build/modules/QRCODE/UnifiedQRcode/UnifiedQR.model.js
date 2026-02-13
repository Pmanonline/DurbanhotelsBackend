"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ===================================
// SCHEMAS
// ===================================
// QR Design Schema - Shared
const QRDesignSchema = new mongoose_1.Schema({
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
    frame_color: { type: String, default: "#000000" },
    frame_text: { type: String, maxlength: 50 },
    body_pattern: {
        type: String,
        enum: ["single", "gradient", "transparent"],
        default: "single",
    },
    qr_primary_color: { type: String, default: "#000000" },
    qr_secondary_color: { type: String, default: "#000000" },
    qr_background_color: { type: String, default: "#FFFFFF" },
    gradient_type: {
        type: String,
        enum: ["linear", "radial"],
        default: "linear",
    },
    gradient_rotation: { type: Number, min: 0, max: 360, default: 0 },
    logo_image: String,
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
    error_correction: {
        type: String,
        enum: ["L", "M", "Q", "H"],
        default: "M",
    },
    margin: { type: Number, min: 0, max: 10, default: 2 },
    qr_size: { type: Number, min: 300, max: 2000, default: 1000 },
}, { _id: false });
// Type-Specific Schemas
const URLDataSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    title: String,
    description: String,
}, { _id: false });
const WiFiDataSchema = new mongoose_1.Schema({
    ssid: { type: String, required: true },
    password: { type: String, required: true },
    security: {
        type: String,
        enum: ["WPA", "WEP", "nopass"],
        required: true,
        default: "WPA",
    },
    hidden: { type: Boolean, default: false },
    network_name: String,
}, { _id: false });
const VCardDataSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    organization: String,
    title: String,
    phone: String,
    mobile: String,
    email: String,
    website: String,
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
    },
    photo: String,
    note: String,
}, { _id: false });
const SocialMediaDataSchema = new mongoose_1.Schema({
    platform: {
        type: String,
        enum: [
            "instagram",
            "facebook",
            "twitter",
            "linkedin",
            "tiktok",
            "youtube",
            "custom",
        ],
        required: true,
    },
    username: String,
    url: { type: String, required: true },
    profile_image: String,
    bio: String,
    links: [
        {
            title: String,
            url: String,
            icon: String,
        },
    ],
}, { _id: false });
const EventDataSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    location: String,
    start_date: { type: Date, required: true },
    end_date: Date,
    organizer: String,
    url: String,
    timezone: String,
}, { _id: false });
const PresentationDataSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    file_url: String,
    file_type: {
        type: String,
        enum: ["pdf", "images", "mixed"],
        required: true,
    },
    total_pages: { type: Number, required: true, min: 1 },
    pages: [
        {
            page_number: Number,
            title: String,
            content: String,
            image_url: String,
        },
    ],
    viewer_settings: {
        view_mode: {
            type: String,
            enum: ["sliding", "tabbing", "flipbook", "scroll", "grid"],
            default: "sliding",
        },
        enable_download: { type: Boolean, default: false },
        enable_sharing: { type: Boolean, default: true },
        autoplay: { type: Boolean, default: false },
        autoplay_delay: { type: Number, default: 5, min: 1 },
    },
}, { _id: false });
// ===================================
// MAIN UNIFIED QR SCHEMA
// ===================================
const UnifiedQRSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IndividualUser",
        required: [true, "User ID is required"],
        index: true,
    },
    daily_scan_fingerprints: {
        type: Map,
        of: [String], // Map<dateString, fingerprint[]>
        default: () => ({}),
        select: false, // Never returned in queries by default
    },
    // QR Type
    qr_type: {
        type: String,
        enum: ["url", "wifi", "vcard", "social", "event", "presentation", "menu"],
        required: [true, "QR type is required"],
        index: true,
    },
    // Basic Info
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    shortCode: {
        type: String,
        required: [true, "Short code is required"],
        unique: true,
        trim: true,
        index: true,
    },
    // Type-Specific Data
    url_data: URLDataSchema,
    wifi_data: WiFiDataSchema,
    vcard_data: VCardDataSchema,
    social_data: SocialMediaDataSchema,
    event_data: EventDataSchema,
    presentation_data: PresentationDataSchema,
    // QR Code Data
    qr_code_url: {
        type: String,
        required: [true, "QR code URL is required"],
        index: true,
    },
    qr_code_image: String,
    short_url: String,
    // QR Design
    qr_design: {
        type: QRDesignSchema,
        required: true,
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
    // Styling
    styling: {
        primary_color: { type: String, default: "#3B82F6" },
        secondary_color: { type: String, default: "#6B7280" },
        font_family: { type: String, default: "Inter" },
        theme: {
            type: String,
            enum: ["light", "dark", "auto"],
            default: "light",
        },
    },
    // Access Control
    access_settings: {
        is_public: { type: Boolean, default: true },
        requires_password: { type: Boolean, default: false },
        password: { type: String, select: false },
        expiry_date: Date,
        max_scans: Number,
        current_scans: { type: Number, default: 0 },
    },
    // Analytics
    scan_count: { type: Number, default: 0 },
    last_scanned_at: Date,
    // Status
    is_active: { type: Boolean, default: true, index: true },
    // Metadata
    tags: [String],
    category: String,
    // SEO
    meta_title: String,
    meta_description: String,
}, {
    timestamps: true,
});
// Indexes
UnifiedQRSchema.index({ user_id: 1, qr_type: 1 });
UnifiedQRSchema.index({ shortCode: 1 });
UnifiedQRSchema.index({ is_active: 1, "access_settings.is_public": 1 });
// Validation: Ensure type-specific data matches qr_type
UnifiedQRSchema.pre("save", function (next) {
    const validTypeDataMap = {
        url: "url_data",
        wifi: "wifi_data",
        vcard: "vcard_data",
        social: "social_data",
        event: "event_data",
        presentation: "presentation_data",
    };
    const expectedField = validTypeDataMap[this.qr_type];
    if (expectedField && !this[expectedField]) {
        return next(new Error(`${expectedField} is required for QR type: ${this.qr_type}`));
    }
    next();
});
const UnifiedQR = (0, mongoose_1.model)("UnifiedQR", UnifiedQRSchema);
exports.default = UnifiedQR;
