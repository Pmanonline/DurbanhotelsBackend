import mongoose, { Document, model, Model, Schema } from "mongoose";
import { emailValidator } from "../../../utilities/validator.utils";
import { hash, compare } from "bcrypt";
import crypto from "crypto";

export interface AdminUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  name: string;
  role: string;
  phone_number: string;
  password: string;
  refreshToken?: string;
  email_verified: boolean;
  passwordChangedAt?: Date;
  passwordResetExpires?: Date;
  passwordResetToken?: string;
  isSuperAdmin: boolean;
  permissions: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  comparePasswordResetToken(token: string): boolean;
}

export interface AdminUserModel extends Model<AdminUserDocument> {}

const adminUserSchema = new Schema<AdminUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please tell us your email"],
      lowercase: true,
      trim: true,
      minlength: [5, "Email must be at least 5 characters"],
      validate: {
        validator: emailValidator,
        message: "Invalid email format",
      },
    },
    phone_number: {
      type: String,
      trim: true,
      required: false,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["admin", "super-admin"],
      default: "admin",
      required: [true, "Please provide role"],
    },
    refreshToken: { type: String },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// Hash password before saving
adminUserSchema.pre<AdminUserDocument>("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const saltRounds = 12; // Higher for admin security
      this.password = await hash(this.password, saltRounds);
    } catch (err: any) {
      next(err);
    }
  }
  next();
});

// Compare password method
adminUserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await compare(candidatePassword, this.password);
};

// Create password reset token
adminUserSchema.methods.createPasswordResetToken = function (
  this: AdminUserDocument
) {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetExpires = new Date();
  resetExpires.setMinutes(resetExpires.getMinutes() + 10); // 10 minutes expiry
  this.passwordResetExpires = resetExpires;

  return resetToken;
};

// Compare password reset token
adminUserSchema.methods.comparePasswordResetToken = function (token: string) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return this.passwordResetToken === hashedToken;
};

const AdminUser = model<AdminUserDocument, AdminUserModel>(
  "AdminUser",
  adminUserSchema
);

export default AdminUser;
