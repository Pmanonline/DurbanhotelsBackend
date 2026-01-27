import mongoose, { Document, model, Model, Schema } from "mongoose";

// Activity Log Interface
export interface ActivityLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;

  // Activity details
  activity_type:
    | "menu_created"
    | "menu_updated"
    | "menu_deleted"
    | "qr_scanned"
    | "analytics_downloaded"
    | "team_invitation"
    | "settings_changed";

  title: string;
  description: string;

  // Related entity
  entity_type?: "menu" | "qr_code" | "team" | "analytics" | "settings";
  entity_id?: mongoose.Types.ObjectId | string;
  entity_name?: string;

  // Status
  status: "success" | "pending" | "failed" | "info";

  // Additional metadata
  metadata?: {
    [key: string]: any;
  };

  // Request info (optional)
  ip_address?: string;
  user_agent?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLogModel extends Model<ActivityLogDocument> {}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "IndividualUser",
      required: [true, "User ID is required"],
      index: true,
    },
    activity_type: {
      type: String,
      enum: [
        "menu_created",
        "menu_updated",
        "menu_deleted",
        "qr_scanned",
        "analytics_downloaded",
        "team_invitation",
        "settings_changed",
      ],
      required: [true, "Activity type is required"],
      index: true,
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
      enum: ["menu", "qr_code", "team", "analytics", "settings"],
    },
    entity_id: {
      type: Schema.Types.Mixed, // Can be ObjectId or string
    },
    entity_name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["success", "pending", "failed", "info"],
      default: "success",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
ActivityLogSchema.index({ user_id: 1, createdAt: -1 });
ActivityLogSchema.index({ user_id: 1, activity_type: 1, createdAt: -1 });
ActivityLogSchema.index({ entity_id: 1, entity_type: 1 });

// Auto-delete old logs after 90 days (optional)
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ActivityLog = model<ActivityLogDocument, ActivityLogModel>(
  "ActivityLog",
  ActivityLogSchema,
);

export default ActivityLog;
