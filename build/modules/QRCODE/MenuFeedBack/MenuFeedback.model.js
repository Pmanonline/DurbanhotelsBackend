"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const MenuFeedbackSchema = new mongoose_1.Schema({
    menu_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "MenuQR",
        required: true,
        index: true,
    },
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IndividualUser",
        sparse: true,
    },
    user_ip: {
        type: String,
        sparse: true,
    },
    type: {
        type: String,
        enum: ["review", "report", "suggestion", "comment", "rating"],
        required: true,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        validate: {
            validator: function () {
                if (this.type === "review" || this.type === "rating") {
                    return (this.rating !== undefined && this.rating >= 1 && this.rating <= 5);
                }
                return true;
            },
            message: "Rating is required for review/rating type (1-5 stars)",
        },
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100,
    },
    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true,
        minlength: [5, "Message must be at least 5 characters"],
        maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    category: {
        type: String,
        enum: [
            "food_quality",
            "service",
            "pricing",
            "hygiene",
            "atmosphere",
            "other",
        ],
        default: "other",
    },
    status: {
        type: String,
        enum: ["pending", "read", "archived"],
        default: "pending",
        index: true,
    },
    is_public: {
        type: Boolean,
        default: function () {
            return this.type === "review" || this.type === "rating";
        },
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});
MenuFeedbackSchema.index({ menu_id: 1, status: 1 });
MenuFeedbackSchema.index({ menu_id: 1, type: 1 });
MenuFeedbackSchema.index({ menu_id: 1, created_at: -1 });
MenuFeedbackSchema.index({ user_ip: 1, created_at: 1 });
MenuFeedbackSchema.pre("save", function (next) {
    this.updated_at = new Date();
    next();
});
const MenuFeedback = mongoose_1.default.model("MenuFeedback", MenuFeedbackSchema);
exports.default = MenuFeedback;
