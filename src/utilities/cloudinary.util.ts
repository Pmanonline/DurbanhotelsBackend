// utils/cloudinary.util.ts
import cloudinary from "cloudinary";
import fs from "fs/promises";
import { ErrorResponse } from "../utilities/errorHandler.util";

// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom error class for Cloudinary errors
class CloudinaryError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "CloudinaryError";
    this.statusCode = statusCode;
    this.status = "error";
  }
}

// Type guard to check if error is an instance of Error
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

// Get error message safely
const getErrorMessage = (error: unknown): string => {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
};

// Upload image to Cloudinary
export const uploadToCloudinary = async (
  file: any,
  folder = "duban-hotel/menu",
): Promise<string> => {
  try {
    if (!file?.tempFilePath) {
      throw new CloudinaryError("No temp file path found", 400);
    }

    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto:good" },
        { format: "webp" },
      ],
    });

    // Clean up temp file
    await fs.unlink(file.tempFilePath).catch(() => {});

    return result.secure_url;
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);

    if (error instanceof CloudinaryError) {
      throw error;
    }

    throw new CloudinaryError(
      `Cloudinary upload failed: ${getErrorMessage(error)}`,
      500,
    );
  }
};

// Upload multiple images
export const uploadMultipleToCloudinary = async (
  files: any[],
  folder = "duban-hotel/menu",
): Promise<string[]> => {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file, folder),
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Multiple upload to Cloudinary failed:", error);

    if (error instanceof CloudinaryError) {
      throw error;
    }

    throw new CloudinaryError(
      `Multiple Cloudinary upload failed: ${getErrorMessage(error)}`,
      500,
    );
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    if (!url) {
      console.warn("No URL provided for deletion");
      return;
    }

    // Extract public ID from Cloudinary URL
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
      throw new CloudinaryError(`Failed to delete image: ${publicId}`, 500);
    }
  } catch (error) {
    console.error(`Failed to delete from Cloudinary:`, error);

    if (error instanceof CloudinaryError) {
      throw error;
    }

    throw new CloudinaryError(
      `Cloudinary deletion failed: ${getErrorMessage(error)}`,
      500,
    );
  }
};

// Delete multiple images
export const deleteMultipleFromCloudinary = async (
  urls: string[],
): Promise<void> => {
  try {
    if (!urls || urls.length === 0) {
      return;
    }

    const deletePromises = urls.map((url) => deleteFromCloudinary(url));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Multiple deletion from Cloudinary failed:", error);

    if (error instanceof CloudinaryError) {
      throw error;
    }

    throw new CloudinaryError(
      `Multiple Cloudinary deletion failed: ${getErrorMessage(error)}`,
      500,
    );
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url) return null;

    const urlParts = url.split("/");
    const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

    if (versionIndex === -1) return null;

    return urlParts
      .slice(versionIndex + 1)
      .join("/")
      .replace(/\.[^/.]+$/, "");
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};
