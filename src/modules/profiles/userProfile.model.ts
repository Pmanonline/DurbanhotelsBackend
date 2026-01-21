import mongoose, { Document, model, Model, Schema } from "mongoose";
import { emailValidator } from "../../utilities/validator.utils";

export interface BankDetails {
  account_number: string;
  bank_name: string;
  account_name: string;
  bank_code?: string;
}

export interface UserProfileDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  email: string;
  phone_number?: string;
  name?: string;
  username?: string;
  avatar?: string | null;
  image?: string | null;
  bank_details?: BankDetails | null;
  deals_completed: number;
  rating: number;
  rating_count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileModel extends Model<UserProfileDocument> {}

const bankDetailsSchema = new Schema(
  {
    account_number: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      minlength: [10, "Account number must be at least 10 digits"],
    },
    bank_name: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    account_name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
    },
    bank_code: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const userProfileSchema = new Schema<UserProfileDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      validate: {
        validator: emailValidator,
        message: "Invalid email format",
      },
    },
    phone_number: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    bank_details: {
      type: bankDetailsSchema,
      default: null,
    },
    deals_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    rating_count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userProfileSchema.index({ user_id: 1 });
userProfileSchema.index({ email: 1 });
userProfileSchema.index({ username: 1 });

// Virtual for formatted rating
userProfileSchema.virtual("formatted_rating").get(function () {
  return this.rating.toFixed(1);
});

const UserProfile = model<UserProfileDocument, UserProfileModel>(
  "UserProfile",
  userProfileSchema
);

export default UserProfile;
