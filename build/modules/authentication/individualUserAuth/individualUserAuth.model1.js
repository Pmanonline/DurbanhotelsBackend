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
const individualUserSchema = new mongoose_1.Schema({
    orguser: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    createdAt: { type: String },
    // Bank details
    bank_details: {
        account_number: { type: String },
        bank_name: { type: String },
        account_name: { type: String },
        bank_code: { type: String },
    },
}, { timestamps: true });
individualUserSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("password")) {
            try {
                const saltRounds = 10;
                this.password = yield (0, bcrypt_1.hash)(this.password, saltRounds);
            }
            catch (err) {
                next(err);
            }
        }
        next();
    });
});
individualUserSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, bcrypt_1.compare)(candidatePassword, this.password);
    });
};
individualUserSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 10);
    this.passwordResetExpires = resetExpires;
    return resetToken;
};
individualUserSchema.methods.comparePasswordResetToken = function (token) {
    var _a;
    const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
    return ((_a = this.passwordResetToken) === null || _a === void 0 ? void 0 : _a.token) === hashedToken;
};
const IndividualUser = (0, mongoose_1.model)("IndividualUser", individualUserSchema);
exports.default = IndividualUser;
