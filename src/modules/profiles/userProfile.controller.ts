import { Response, NextFunction } from "express";
import { ErrorResponse } from "../../utilities/errorHandler.util";
import { AuthenticatedRequest } from "./types";
import { UpdateProfileBody, UpdateBankDetailsBody } from "./types";
import IndividualUser, {
  IndividualUserDocument,
} from "../authentication/individualUserAuth/individualUserAuth.model1";
import OrganizationUser, {
  organizationalDoc,
} from "../authentication/organizationUserAuth/organizationAuth.model";
import cloudinary from "cloudinary";
import fs from "fs/promises";

// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file: any, folder = "profiles/images") => {
  try {
    if (!file?.tempFilePath) {
      throw new Error("No temp file path found");
    }

    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" },
        { format: "jpg" },
      ],
    });

    await fs.unlink(file.tempFilePath);
    return result.secure_url;
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (url: string) => {
  try {
    if (!url) return;

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

    const result = await cloudinary.v2.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
    } else {
      console.error(`Deletion failed for: ${publicId}`, result);
    }
  } catch (error) {
    console.error(`Failed to delete from Cloudinary:`, error);
  }
};

// Types for user identification
export interface UserIdentification {
  userId: string;
  userType: "individual" | "organization";
  originalUser: IndividualUserDocument | organizationalDoc;
}

export const identifyUserType = async (
  req: any
): Promise<UserIdentification | null> => {
  const tokenUser = req.user;
  const userId = tokenUser?.userData?._id || tokenUser?._id || tokenUser?.id;

  if (!userId) {
    console.error("❌ No user ID found in token");
    return null;
  }

  try {
    const individualUser = await IndividualUser.findById(userId);
    if (individualUser) {
      console.log("✅ User identified as Individual:", individualUser.email);
      return {
        userId: individualUser._id.toString(),
        userType: "individual",
        originalUser: individualUser,
      };
    }

    const orgUser = await OrganizationUser.findById(userId);
    if (orgUser) {
      console.log(
        "✅ User identified as Organization:",
        orgUser.organization_email || orgUser.contact_email
      );
      return {
        userId: orgUser._id.toString(),
        userType: "organization",
        originalUser: orgUser,
      };
    }

    console.error(
      "❌ User not found in either Individual or Organization collections"
    );
    return null;
  } catch (error) {
    console.error("❌ Error identifying user type:", error);
    return null;
  }
};

// Helper function to format profile data
const formatProfileData = (
  user: IndividualUserDocument | organizationalDoc,
  userType: "individual" | "organization"
) => {
  if (userType === "individual") {
    const indUser = user as IndividualUserDocument;
    return {
      _id: indUser._id,
      user_id: indUser._id,
      email: indUser.email,
      name: indUser.name,
      phone_number: indUser.phone_number,
      username: indUser.username || "",
      image: indUser.image || null,
      deals_completed: indUser.deals_completed || 0,
      rating: indUser.rating || 0,
      rating_count: indUser.rating_count || 0,
    };
  } else {
    const orgUser = user as organizationalDoc;
    return {
      _id: orgUser._id,
      user_id: orgUser._id,
      email: orgUser.organization_email,
      name: orgUser.organization_name,
      phone_number: orgUser.contact_number,
      username: "",
      image: orgUser.image || null,
      deals_completed: orgUser.deals_completed || 0,
      rating: orgUser.rating || 0,
      rating_count: orgUser.rating_count || 0,
    };
  }
};

// Get user profile
export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    // Fetch user with all fields
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
    }

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    const profileData = formatProfileData(user, userInfo.userType);

    res.status(200).json({
      status: "success",
      data: {
        profile: profileData,
        userType: userInfo.userType,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching profile",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Update user profile
export const updateUserProfile = async (
  req: AuthenticatedRequest<UpdateProfileBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);

    // Handle form-data: express-fileupload parses fields into req.body
    // But we need to check if body exists first
    let phone_number: string | undefined;
    let name: string | undefined;

    if (req.body) {
      phone_number = req.body.phone_number;
      name = req.body.name;
    }

    console.log("📦 Request body:", req.body);
    console.log("📁 Request files:", req.files);
    console.log("📞 Phone number:", phone_number);
    console.log("📝 Name:", name);

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    console.log(
      `🔍 Updating profile for user: ${userInfo.userId}, Type: ${userInfo.userType}`
    );

    // Find and update the user
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
      if (user) {
        const indUser = user as IndividualUserDocument;
        if (phone_number) indUser.phone_number = phone_number;
        if (name) indUser.name = name;
      }
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
      if (user) {
        const orgUser = user as organizationalDoc;
        if (phone_number) orgUser.contact_number = phone_number;
        if (name) orgUser.organization_name = name;
      }
    }

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    // Handle profile image upload if file exists
    if (req.files && (req.files as any).image) {
      const imageFile = (req.files as any).image;

      try {
        console.log("📸 Processing image upload...");

        // Delete old image if exists
        if (user.image) {
          console.log("🗑️ Deleting old image...");
          await deleteFromCloudinary(user.image);
        }

        // Upload new image to Cloudinary
        const imageUrl = await uploadToCloudinary(imageFile, "profiles/images");
        user.image = imageUrl;
        console.log("✅ Image uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError);
      }
    }

    await user.save();
    console.log("✅ Profile updated successfully");

    const profileData = formatProfileData(user, userInfo.userType);

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        profile: profileData,
        userType: userInfo.userType,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateUserProfile:", error);

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating profile",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Upload profile image only
export const uploadProfileImage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    if (!req.files || !(req.files as any).image) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "No image file provided",
      };
      return next(error);
    }

    const imageFile = (req.files as any).image;

    // Find the user
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
    }

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    // Delete old image if exists
    if (user.image) {
      console.log("🗑️ Deleting old image...");
      await deleteFromCloudinary(user.image);
    }

    // Upload new image
    console.log("📸 Uploading new image...");
    const imageUrl = await uploadToCloudinary(imageFile, "profiles/images");
    user.image = imageUrl;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile image uploaded successfully",
      data: {
        image: imageUrl,
      },
    });
  } catch (error) {
    console.error("❌ Error uploading profile image:", error);

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error uploading profile image",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Delete profile image
export const deleteProfileImage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    // Find the user
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
    }

    if (!user || !user.image) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "No profile image found to delete",
      };
      return next(error);
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(user.image);

    // Remove from user record
    user.image = undefined;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile image deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting profile image:", error);

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error deleting profile image",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Update bank details
export const updateBankDetails = async (
  req: AuthenticatedRequest<UpdateBankDetailsBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);
    const { account_number, bank_name, account_name, bank_code } = req.body;

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    if (!account_number || !bank_name || !account_name) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Account number, bank name, and account name are required",
      };
      return next(error);
    }

    // Find the user
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
    }

    if (!user) {
      const error: ErrorResponse = {
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

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Bank details updated successfully",
      data: {
        bank_details: user.bank_details,
        userType: userInfo.userType,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating bank details",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Get bank details
export const getBankDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await identifyUserType(req);

    if (!userInfo) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    // Find the user
    let user: IndividualUserDocument | organizationalDoc | null;

    if (userInfo.userType === "individual") {
      user = await IndividualUser.findById(userInfo.userId);
    } else {
      user = await OrganizationUser.findById(userInfo.userId);
    }

    if (!user) {
      const error: ErrorResponse = {
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
        userType: userInfo.userType,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching bank details",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Helper function to get user type
export const getUserType = async (
  userId: string
): Promise<"individual" | "organization" | null> => {
  try {
    const individualUser = await IndividualUser.findById(userId);
    if (individualUser) return "individual";

    const orgUser = await OrganizationUser.findById(userId);
    if (orgUser) return "organization";

    return null;
  } catch (error) {
    console.error("Error getting user type:", error);
    return null;
  }
};
