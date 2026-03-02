import mongoose, { Schema, Document } from "mongoose";

export interface ISession {
  user: mongoose.Types.ObjectId;
  userAgent: string;
  role: string;
  valid: boolean;
  refreshToken: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISessionDocument extends ISession, Document {
  _id: mongoose.Types.ObjectId;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "IndividualUser",
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
      default: "unknown",
    },
    role: {
      type: String,
      required: true,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: "", // Allow empty string initially
    },
  },
  {
    timestamps: true,
  },
);

export const Session = mongoose.model<ISessionDocument>(
  "Session",
  sessionSchema,
);
