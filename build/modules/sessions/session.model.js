"use strict";
// // import mongoose, { Schema } from "mongoose";
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
exports.Session = void 0;
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
const mongoose_1 = __importStar(require("mongoose"));
const sessionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
exports.Session = mongoose_1.default.model("Session", sessionSchema);
