// // import mongoose, { Schema } from "mongoose";

// // interface ISession {
// //   user: Schema.Types.ObjectId;
// //   valid: boolean;
// //   userAgent: string;
// //   role: string;
// //   createdAt: Date;
// //   updatedAt: Date;
// // }

// // const sessionSchema = new Schema<ISession>(
// //   {
// //     user: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "role",
// //     },
// //     role: {
// //       type: String,
// //       enum: ["org", "ind", "g-org", "g-ind", "mediator", "admin"],
// //     },
// //     valid: { type: Boolean, default: true },
// //     userAgent: { type: String },
// //   },
// //   {
// //     timestamps: true,
// //   }
// // );

// // const Session = mongoose.model<ISession>("Session", sessionSchema);

// // export { Session };
// // src/modules/sessions/session.model.ts
// import mongoose, { Schema, Document } from "mongoose";

// export interface ISession extends Document {
//   user: mongoose.Types.ObjectId;
//   role: "org" | "ind" | "g-org" | "g-ind" | "mediator" | "admin";
//   refreshToken: string;
//   valid: boolean;
//   userAgent: string;
// }

// const sessionSchema = new Schema<ISession>(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       required: true,
//       refPath: "role", // dynamic reference
//     },
//     role: {
//       type: String,
//       required: true,
//       enum: ["org", "ind", "g-org", "g-ind", "mediator", "admin"],
//     },
//     refreshToken: {
//       type: String,
//       required: true,
//     },
//     valid: {
//       type: Boolean,
//       default: true,
//     },
//     userAgent: {
//       type: String,
//       default: "unknown",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // ──────────────────────────────
// // Indexes – CORRECT WAY (no more TS2322)
// // ──────────────────────────────
// sessionSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 30 * 24 * 60 * 60 }
// ); // auto-delete after 30 days
// sessionSchema.index({ refreshToken: 1 });
// sessionSchema.index({ user: 1, valid: 1 }); // note: use 1, not true

// const Session = mongoose.model<ISession>("Session", sessionSchema);

// export { Session };

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
  }
);

export const Session = mongoose.model<ISessionDocument>(
  "Session",
  sessionSchema
);
