"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ActivityLogSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IndividualUser",
        required: [true, "User ID is required"],
        index: true,
    },
    activity_type: {
        type: String,
        required: [true, "Activity type is required"],
        index: true,
        // Remove hardcoded enum - it will be validated by service types
    },
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true,
    },
    entity_type: {
        type: String,
        // Remove hardcoded enum - it will be validated by service types
    },
    entity_id: {
        type: mongoose_1.Schema.Types.Mixed, // Can be ObjectId or string
    },
    entity_name: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        default: "success",
        index: true,
        // Remove hardcoded enum - it will be validated by service types
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    ip_address: {
        type: String,
    },
    user_agent: {
        type: String,
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient queries
ActivityLogSchema.index({ user_id: 1, createdAt: -1 });
ActivityLogSchema.index({ user_id: 1, activity_type: 1, createdAt: -1 });
ActivityLogSchema.index({ entity_id: 1, entity_type: 1 });
// Auto-delete old logs after 90 days (optional)
// Commented out for now - uncomment when you want to enable TTL
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
const ActivityLog = (0, mongoose_1.model)("ActivityLog", ActivityLogSchema);
exports.default = ActivityLog;
