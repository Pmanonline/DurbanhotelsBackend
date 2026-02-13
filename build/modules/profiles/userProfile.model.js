"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const validator_utils_1 = require("../../utilities/validator.utils");
const bankDetailsSchema = new mongoose_1.Schema({
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
}, { _id: false });
const userProfileSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: validator_utils_1.emailValidator,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
userProfileSchema.index({ user_id: 1 });
userProfileSchema.index({ email: 1 });
userProfileSchema.index({ username: 1 });
// Virtual for formatted rating
userProfileSchema.virtual("formatted_rating").get(function () {
    return this.rating.toFixed(1);
});
const UserProfile = (0, mongoose_1.model)("UserProfile", userProfileSchema);
exports.default = UserProfile;
