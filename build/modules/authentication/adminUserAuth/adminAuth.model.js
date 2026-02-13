"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const validator_utils_1 = require("../../../utilities/validator.utils");
const bcrypt_1 = require("bcrypt");
const crypto_1 = __importDefault(require("crypto"));
const adminUserSchema = new mongoose_1.Schema({
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
            validator: validator_utils_1.emailValidator,
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
}, { timestamps: true });
// Hash password before saving
adminUserSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("password")) {
            try {
                const saltRounds = 12; // Higher for admin security
                this.password = yield (0, bcrypt_1.hash)(this.password, saltRounds);
            }
            catch (err) {
                next(err);
            }
        }
        next();
    });
});
// Compare password method
adminUserSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, bcrypt_1.compare)(candidatePassword, this.password);
    });
};
// Create password reset token
adminUserSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 10); // 10 minutes expiry
    this.passwordResetExpires = resetExpires;
    return resetToken;
};
// Compare password reset token
adminUserSchema.methods.comparePasswordResetToken = function (token) {
    const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
    return this.passwordResetToken === hashedToken;
};
const AdminUser = (0, mongoose_1.model)("AdminUser", adminUserSchema);
exports.default = AdminUser;
