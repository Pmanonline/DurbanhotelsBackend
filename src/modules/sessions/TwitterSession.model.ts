import mongoose, { Document, Schema, model } from "mongoose";

export interface TwitterSessionDocument extends Document {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: Date;
  createdAt: Date;
}

const twitterSessionSchema = new Schema<TwitterSessionDocument>(
  {
    state: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    codeVerifier: {
      type: String,
      required: true,
    },
    codeChallenge: {
      type: String,
      required: true,
    },
    redirectUri: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired sessions using TTL index
twitterSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TwitterSession = model<TwitterSessionDocument>(
  "TwitterSession",
  twitterSessionSchema
);

export default TwitterSession;
