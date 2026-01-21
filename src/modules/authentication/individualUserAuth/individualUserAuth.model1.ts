// import mongoose, { Document, model, Model, Schema } from "mongoose";
// import { emailValidator } from "../../../utilities/validator.utils";
// import { hash, compare } from "bcrypt";
// import crypto from "crypto";

// export interface IndividualUserDocument extends Document {
//   orguser: mongoose.Schema.Types.ObjectId;
//   _id: mongoose.Types.ObjectId;
//   email: string;
//   username: string;
//   name: string;
//   sub: string;
//   picture: string;
//   role: string;
//   phone_number: string;
//   password: string;
//   email_verified: boolean;
//   refreshToken?: string;
//   passwordChangedAt?: Date;
//   passwordResetExpires?: Date;
//   passwordResetToken?: string;

//   // Profile fields
//   image?: string;
//   deals_completed: number;
//   rating: number;
//   rating_count: number;

//   // Bank details
//   bank_details?: {
//     account_number: string;
//     bank_name: string;
//     account_name: string;
//     bank_code?: string;
//   };

//   comparePassword(candidatePassword: string): Promise<boolean>;
//   createPasswordResetToken(): string;
//   comparePasswordResetToken(token: string): boolean;
// }

// export interface IndividualUserModel extends Model<IndividualUserDocument> {}

// const individualUserSchema = new Schema<IndividualUserDocument>(
//   {
//     orguser: {
//       type: Schema.Types.ObjectId,
//       ref: "orgUser",
//     },
//     name: { type: String },
//     username: { type: String },
//     email: {
//       type: String,
//       unique: true,
//       required: [true, "Please tell us your email"],
//       lowercase: true,
//       trim: true,
//       minlength: [5, "Email must be at least 5 characters"],
//       validate: {
//         validator: emailValidator,
//         message: "Invalid email format",
//       },
//     },
//     phone_number: {
//       type: String,
//       trim: true,
//       required: false,
//     },
//     email_verified: {
//       type: Boolean,
//       default: false,
//     },
//     sub: String,
//     role: {
//       type: String,
//       enum: ["ind", "g-ind"],
//       required: [true, "Please provide role"],
//     },
//     refreshToken: { type: String },
//     picture: String,
//     password: {
//       type: String,
//       select: false,
//     },
//     passwordChangedAt: Date,
//     passwordResetToken: String,
//     passwordResetExpires: Date,

//     // Profile fields
//     image: { type: String },
//     deals_completed: { type: Number, default: 0 },
//     rating: { type: Number, default: 0 },
//     rating_count: { type: Number, default: 0 },

//     // Bank details
//     bank_details: {
//       account_number: { type: String },
//       bank_name: { type: String },
//       account_name: { type: String },
//       bank_code: { type: String },
//     },
//   },
//   { timestamps: true }
// );

// individualUserSchema.pre<IndividualUserDocument>("save", async function (next) {
//   if (this.isModified("password")) {
//     try {
//       const saltRounds = 10;
//       this.password = await hash(this.password, saltRounds);
//     } catch (err: any) {
//       next(err);
//     }
//   }
//   next();
// });

// individualUserSchema.methods.comparePassword = async function (
//   candidatePassword: string
// ) {
//   return await compare(candidatePassword, this.password);
// };

// individualUserSchema.methods.createPasswordResetToken = function (
//   this: IndividualUserDocument
// ) {
//   const resetToken = crypto.randomBytes(32).toString("hex");
//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   const resetExpires = new Date();
//   resetExpires.setMinutes(resetExpires.getMinutes() + 10);
//   this.passwordResetExpires = resetExpires;

//   return resetToken;
// };

// individualUserSchema.methods.comparePasswordResetToken = function (
//   token: string
// ) {
//   const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
//   return this.passwordResetToken?.token === hashedToken;
// };

// const IndividualUser = model<IndividualUserDocument, IndividualUserModel>(
//   "IndividualUser",
//   individualUserSchema
// );

// export default IndividualUser;
import mongoose, { Document, model, Model, Schema } from "mongoose";
import { emailValidator } from "../../../utilities/validator.utils";
import { hash, compare } from "bcrypt";
import crypto from "crypto";

export interface IndividualUserDocument extends Document {
  orguser: mongoose.Schema.Types.ObjectId;
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  name: string;
  sub: string;
  picture: string;
  role: string;
  phone_number: string;
  password: string;
  email_verified: boolean;
  refreshToken?: string;
  passwordChangedAt?: Date;
  passwordResetExpires?: Date;
  passwordResetToken?: string;

  // Profile fields
  image?: string;
  deals_completed: number;
  rating: number;
  rating_count: number;

  // Bank details
  bank_details?: {
    account_number: string;
    bank_name: string;
    account_name: string;
    bank_code?: string;
  };

  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  comparePasswordResetToken(token: string): boolean;
}

export interface IndividualUserModel extends Model<IndividualUserDocument> {}

const individualUserSchema = new Schema<IndividualUserDocument>(
  {
    orguser: {
      type: Schema.Types.ObjectId,
      ref: "orgUser",
    },
    name: { type: String },
    username: { type: String },
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
    sub: String,
    role: {
      type: String,
      enum: ["ind", "g-ind"],
      required: [true, "Please provide role"],
    },
    refreshToken: { type: String },
    picture: String,
    password: {
      type: String,
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Profile fields
    image: { type: String },
    deals_completed: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },

    // Bank details
    bank_details: {
      account_number: { type: String },
      bank_name: { type: String },
      account_name: { type: String },
      bank_code: { type: String },
    },
  },
  { timestamps: true }
);

individualUserSchema.pre<IndividualUserDocument>("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const saltRounds = 10;
      this.password = await hash(this.password, saltRounds);
    } catch (err: any) {
      next(err);
    }
  }
  next();
});

individualUserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await compare(candidatePassword, this.password);
};

individualUserSchema.methods.createPasswordResetToken = function (
  this: IndividualUserDocument
) {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetExpires = new Date();
  resetExpires.setMinutes(resetExpires.getMinutes() + 10);
  this.passwordResetExpires = resetExpires;

  return resetToken;
};

individualUserSchema.methods.comparePasswordResetToken = function (
  token: string
) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return this.passwordResetToken?.token === hashedToken;
};

const IndividualUser = model<IndividualUserDocument, IndividualUserModel>(
  "IndividualUser",
  individualUserSchema
);

export default IndividualUser;
