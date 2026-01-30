import mongoose, { Document, model, Model, Schema } from "mongoose";

// Import types from service to ensure consistency
import {
  ActivityType,
  EntityType,
  ActivityStatus,
} from "./activityLog.service";

// Activity Log Interface
export interface ActivityLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;

  // Activity details - using the exported ActivityType
  activity_type: ActivityType;

  title: string;
  description: string;

  // Related entity - using the exported EntityType
  entity_type?: EntityType;
  entity_id?: mongoose.Types.ObjectId | string;
  entity_name?: string;

  // Status - using the exported ActivityStatus
  status: ActivityStatus;

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
      type: Schema.Types.Mixed, // Can be ObjectId or string
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
// Commented out for now - uncomment when you want to enable TTL
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ActivityLog = model<ActivityLogDocument, ActivityLogModel>(
  "ActivityLog",
  ActivityLogSchema,
);

export default ActivityLog;
