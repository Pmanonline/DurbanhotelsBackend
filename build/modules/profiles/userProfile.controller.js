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
exports.deleteAccount = exports.changePassword = exports.updateUserProfile = exports.getUserType = exports.getBankDetails = exports.updateBankDetails = exports.deleteProfileImage = exports.uploadProfileImage = exports.getUserProfile = exports.identifyUserType = void 0;
const individualUserAuth_model1_1 = __importDefault(require("../authentication/individualUserAuth/individualUserAuth.model1"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const promises_1 = __importDefault(require("fs/promises"));
// Cloudinary configuration
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Helper function to upload image to Cloudinary
const uploadToCloudinary = (file_1, ...args_1) => __awaiter(void 0, [file_1, ...args_1], void 0, function* (file, folder = "profiles/images") {
    try {
        if (!(file === null || file === void 0 ? void 0 : file.tempFilePath)) {
            throw new Error("No temp file path found");
        }
        const result = yield cloudinary_1.default.v2.uploader.upload(file.tempFilePath, {
            folder: folder,
            resource_type: "auto",
            transformation: [
                { width: 500, height: 500, crop: "limit" },
                { quality: "auto" },
                { format: "jpg" },
            ],
        });
        yield promises_1.default.unlink(file.tempFilePath);
        return result.secure_url;
    }
    catch (error) {
        console.error("Upload to Cloudinary failed:", error);
        throw new Error(`Cloudinary upload failed: ${error}`);
    }
});
// Helper function to delete image from Cloudinary
const deleteFromCloudinary = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!url)
            return;
        const urlParts = url.split("/");
        const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));
        if (versionIndex === -1) {
            console.error(`Invalid Cloudinary URL format: ${url}`);
            return;
        }
        const publicId = urlParts
            .slice(versionIndex + 1)
            .join("/")
            .replace(/\.[^/.]+$/, "");
        const result = yield cloudinary_1.default.v2.uploader.destroy(publicId);
        if (result.result === "ok") {
            console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
        }
        else {
            console.error(`Deletion failed for: ${publicId}`, result);
        }
    }
    catch (error) {
        console.error(`Failed to delete from Cloudinary:`, error);
    }
});
const identifyUserType = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tokenUser = req.user;
    const userId = ((_a = tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.userData) === null || _a === void 0 ? void 0 : _a._id) || (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser._id) || (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.id);
    if (!userId) {
        console.error("❌ No user ID found in token");
        return null;
    }
    try {
        const individualUser = yield individualUserAuth_model1_1.default.findById(userId);
        if (individualUser) {
            console.log("✅ User identified as Individual:", individualUser.email);
            return {
                userId: individualUser._id.toString(),
                originalUser: individualUser,
            };
        }
        console.error("❌ User not found in Individual collection");
        return null;
    }
    catch (error) {
        console.error("❌ Error identifying user:", error);
        return null;
    }
});
exports.identifyUserType = identifyUserType;
// Helper function to format profile data
const formatProfileData = (user) => {
    return {
        _id: user._id,
        user_id: user._id,
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        username: user.username || "",
        image: user.image || null,
        deals_completed: user.deals_completed || 0,
        rating: user.rating || 0,
        rating_count: user.rating_count || 0,
        createdAt: user.createdAt,
    };
};
// Get user profile
const getUserProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        // Fetch user with all fields
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        const profileData = formatProfileData(user);
        res.status(200).json({
            status: "success",
            data: {
                profile: profileData,
            },
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching profile",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getUserProfile = getUserProfile;
// Upload profile image only
const uploadProfileImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        if (!req.files || !req.files.image) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "No image file provided",
            };
            return next(error);
        }
        const imageFile = req.files.image;
        // Find the user
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // Delete old image if exists
        if (user.image) {
            console.log("🗑️ Deleting old image...");
            yield deleteFromCloudinary(user.image);
        }
        // Upload new image
        console.log("📸 Uploading new image...");
        const imageUrl = yield uploadToCloudinary(imageFile, "profiles/images");
        user.image = imageUrl;
        yield user.save();
        res.status(200).json({
            status: "success",
            message: "Profile image uploaded successfully",
            data: {
                image: imageUrl,
            },
        });
    }
    catch (error) {
        console.error("❌ Error uploading profile image:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error uploading profile image",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.uploadProfileImage = uploadProfileImage;
// Delete profile image
const deleteProfileImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        // Find the user
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user || !user.image) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "No profile image found to delete",
            };
            return next(error);
        }
        // Delete from Cloudinary
        yield deleteFromCloudinary(user.image);
        // Remove from user record
        user.image = undefined;
        yield user.save();
        res.status(200).json({
            status: "success",
            message: "Profile image deleted successfully",
        });
    }
    catch (error) {
        console.error("❌ Error deleting profile image:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error deleting profile image",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.deleteProfileImage = deleteProfileImage;
// Update bank details
const updateBankDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        const { account_number, bank_name, account_name, bank_code } = req.body;
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        if (!account_number || !bank_name || !account_name) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Account number, bank name, and account name are required",
            };
            return next(error);
        }
        // Find the user
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // Update bank details
        user.bank_details = {
            account_number,
            bank_name,
            account_name,
            bank_code: bank_code || "",
        };
        yield user.save();
        res.status(200).json({
            status: "success",
            message: "Bank details updated successfully",
            data: {
                bank_details: user.bank_details,
            },
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error updating bank details",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.updateBankDetails = updateBankDetails;
// Get bank details
const getBankDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        // Find the user
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        res.status(200).json({
            status: "success",
            data: {
                bank_details: user.bank_details || null,
            },
        });
    }
    catch (error) {
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error fetching bank details",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.getBankDetails = getBankDetails;
// Helper function to get user type
const getUserType = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const individualUser = yield individualUserAuth_model1_1.default.findById(userId);
        if (individualUser)
            return "individual";
        return null;
    }
    catch (error) {
        console.error("Error getting user type:", error);
        return null;
    }
});
exports.getUserType = getUserType;
// Add to your existing userProfile.controller.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
// Update user profile (including name, phone, username)
const updateUserProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        const { phone_number, name, username } = req.body;
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        console.log(`🔍 Updating profile for user: ${userInfo.userId}`);
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // Update user fields
        if (phone_number)
            user.phone_number = phone_number;
        if (name)
            user.name = name;
        if (username)
            user.username = username;
        // Handle profile image upload
        if (req.files && req.files.image) {
            const imageFile = req.files.image;
            try {
                console.log("📸 Processing image upload...");
                // Delete old image if exists
                if (user.image) {
                    console.log("🗑️ Deleting old image...");
                    yield deleteFromCloudinary(user.image);
                }
                // Upload new image to Cloudinary
                const imageUrl = yield uploadToCloudinary(imageFile, "profiles/images");
                user.image = imageUrl;
                console.log("✅ Image uploaded successfully:", imageUrl);
            }
            catch (uploadError) {
                console.error("❌ Image upload failed:", uploadError);
            }
        }
        yield user.save();
        console.log("✅ Profile updated successfully");
        const profileData = formatProfileData(user);
        res.status(200).json({
            status: "success",
            message: "Profile updated successfully",
            data: {
                profile: profileData,
            },
        });
    }
    catch (error) {
        console.error("❌ Error in updateUserProfile:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error updating profile",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.updateUserProfile = updateUserProfile;
// Change password
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        if (!currentPassword || !newPassword || !confirmPassword) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "All password fields are required",
            };
            return next(error);
        }
        if (newPassword !== confirmPassword) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "New passwords do not match",
            };
            return next(error);
        }
        if (newPassword.length < 6) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Password must be at least 6 characters",
            };
            return next(error);
        }
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // Verify current password
        const isPasswordValid = yield bcrypt_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Current password is incorrect",
            };
            return next(error);
        }
        // Hash new password
        const salt = yield bcrypt_1.default.genSalt(10);
        user.password = yield bcrypt_1.default.hash(newPassword, salt);
        yield user.save();
        res.status(200).json({
            status: "success",
            message: "Password changed successfully",
        });
    }
    catch (error) {
        console.error("❌ Error changing password:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error changing password",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.changePassword = changePassword;
// Delete account
const deleteAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userInfo = yield (0, exports.identifyUserType)(req);
        const { password } = req.body;
        if (!userInfo) {
            const error = {
                statusCode: 401,
                status: "fail",
                message: "User not authenticated",
            };
            return next(error);
        }
        if (!password) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Password is required to delete account",
            };
            return next(error);
        }
        const user = yield individualUserAuth_model1_1.default.findById(userInfo.userId);
        if (!user) {
            const error = {
                statusCode: 404,
                status: "fail",
                message: "User not found",
            };
            return next(error);
        }
        // Verify password
        const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            const error = {
                statusCode: 400,
                status: "fail",
                message: "Incorrect password",
            };
            return next(error);
        }
        // Delete profile image from Cloudinary if exists
        if (user.image) {
            yield deleteFromCloudinary(user.image);
        }
        // Delete user from database
        yield individualUserAuth_model1_1.default.findByIdAndDelete(userInfo.userId);
        res.status(200).json({
            status: "success",
            message: "Account deleted successfully",
        });
    }
    catch (error) {
        console.error("❌ Error deleting account:", error);
        const errResponse = {
            statusCode: 500,
            status: "error",
            message: "Error deleting account",
            stack: error instanceof Error ? { stack: error.stack } : undefined,
        };
        next(errResponse);
    }
});
exports.deleteAccount = deleteAccount;
