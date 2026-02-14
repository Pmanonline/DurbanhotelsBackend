import { Router, Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import { UploadedFile } from "express-fileupload";
import { asyncHandler } from "../../../middlewares/asyncHandler.middleware";
import { ErrorResponse } from "../../../utilities/errorHandler.util";

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type FileCategory = "image" | "pdf" | "presentation";

interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
}

const FILE_CONFIGS = {
  image: {
    mimes: ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"],
    maxSize: 10 * 1024 * 1024, // 10 MB
    resourceType: "image" as const,
  },
  pdf: {
    mimes: ["application/pdf"],
    maxSize: 20 * 1024 * 1024, // 20 MB
    resourceType: "image" as const, // Use "image" to get proper Content-Type
  },
  presentation: {
    mimes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxSize: 20 * 1024 * 1024, // 20 MB
    resourceType: "raw" as const,
  },
};

//  Determine file category based on MIME type

const getFileCategory = (mimetype: string): FileCategory | null => {
  if (FILE_CONFIGS.image.mimes.includes(mimetype)) return "image";
  if (FILE_CONFIGS.pdf.mimes.includes(mimetype)) return "pdf";
  if (FILE_CONFIGS.presentation.mimes.includes(mimetype)) return "presentation";
  return null;
};

//  Validate file against its category requirements
const validateFile = (
  file: UploadedFile,
  category: FileCategory,
): { valid: boolean; error?: string } => {
  const config = FILE_CONFIGS[category];

  if (!config.mimes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type for ${category}. Expected: ${config.mimes.join(", ")}`,
    };
  }

  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${config.maxSize / (1024 * 1024)} MB limit for ${category}`,
    };
  }

  // Additional validation for images
  if (category === "image" && file.size < 100) {
    return {
      valid: false,
      error: "File appears to be corrupted or empty",
    };
  }

  return { valid: true };
};

export const uploadPresentationToCloudinary = async (
  file: UploadedFile,
  folder = "qr-presentations",
): Promise<UploadResult> => {
  const category = getFileCategory(file.mimetype);
  if (!category) {
    throw new Error(`Unsupported file type: ${file.mimetype}`);
  }

  const config = FILE_CONFIGS[category];

  const uploadOptions: any = {
    folder: `${folder}/${category}s`, // Organize: images/, pdfs/, presentations/
    resource_type: config.resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,

    type: "upload",

    //Set access mode to public
    access_mode: "public",
  };

  // Special handling for PDFs to ensure proper Content-Type
  if (category === "pdf") {
    uploadOptions.format = "pdf"; // Lock format so URL ends in .pdf
  }

  // Image-specific optimizations
  if (category === "image") {
    uploadOptions.quality = "auto:good";
    uploadOptions.fetch_format = "auto"; // Auto-select best format (WebP when supported)
  }

  try {
    const result = await cloudinary.v2.uploader.upload(
      file.tempFilePath,
      uploadOptions,
    );

    console.log(`✅ Uploaded ${category} to Cloudinary:`, {
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      type: result.type,
      access_mode: result.access_mode,
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
    };
  } catch (error) {
    console.error(`❌ Cloudinary upload failed for ${category}:`, error);
    throw new Error(`Failed to upload ${category} to cloud storage`);
  }
};

/**
 * Extract public_id from Cloudinary URL
 */
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const urlParts = url.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return null;

    const afterUpload = urlParts.slice(uploadIndex + 1);

    // Strip version segment e.g. "v1234567890"
    const withoutVersion = /^v\d+$/.test(afterUpload[0])
      ? afterUpload.slice(1)
      : afterUpload;

    // public_id = folder/filename WITHOUT extension
    const publicId = withoutVersion.join("/").replace(/\.[^/.]+$/, "");

    return publicId;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

/**
 * Delete a Cloudinary asset by its hosted URL.
 * Automatically detects and uses the correct resource type.
 *
 * @param fileUrl - The Cloudinary URL of the file to delete
 * @param file_type - The type of file: "image", "pdf", or "presentation"
 */
export const deletePresentationFromCloudinary = async (
  fileUrl: string,
  file_type?: FileCategory,
): Promise<boolean> => {
  try {
    if (!fileUrl) return false;

    const publicId = extractPublicIdFromUrl(fileUrl);
    if (!publicId) {
      console.warn("⚠️ Could not extract public_id from URL:", fileUrl);
      return false;
    }

    // If file_type is provided, use it directly
    if (file_type && FILE_CONFIGS[file_type]) {
      const resourceType = FILE_CONFIGS[file_type].resourceType;

      const result = await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "upload", // Match the upload type
      });

      if (result.result === "ok") {
        console.log(`✅ Deleted ${file_type} from Cloudinary: ${publicId}`);
        return true;
      } else if (result.result === "not found") {
        console.warn(`⚠️ File not found in Cloudinary: ${publicId}`);
        return false;
      } else {
        console.warn(`⚠️ Unexpected deletion result for ${publicId}:`, result);
        return false;
      }
    }

    // Fallback: Try "image" first (PDFs uploaded via this route), then "raw"
    let result = await cloudinary.v2.uploader.destroy(publicId, {
      resource_type: "image",
      type: "upload",
    });

    if (result.result !== "ok") {
      result = await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: "raw",
        type: "upload",
      });
    }

    if (result.result === "ok") {
      console.log(`✅ Deleted presentation from Cloudinary: ${publicId}`);
      return true;
    } else {
      console.warn(`⚠️ Cloudinary deletion result for ${publicId}:`, result);
      return false;
    }
  } catch (error) {
    console.error("Failed to delete presentation from Cloudinary:", error);
    return false;
  }
};

// Route
const uploadRouter = Router();

const handlePresentationUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.files || !req.files.file) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "No file provided. Send the file under the field name 'file'.",
      } as ErrorResponse);
    }

    const file = Array.isArray(req.files.file)
      ? req.files.file[0]
      : (req.files.file as UploadedFile);

    // Determine file category
    const category = getFileCategory(file.mimetype);
    if (!category) {
      return next({
        statusCode: 400,
        status: "fail",
        message: `Unsupported file type: ${file.mimetype}. Allowed types: images (JPEG, PNG, WebP, GIF), PDF, PowerPoint (PPT, PPTX)`,
      } as ErrorResponse);
    }

    // Validate file
    const validation = validateFile(file, category);
    if (!validation.valid) {
      return next({
        statusCode: 400,
        status: "fail",
        message: validation.error,
      } as ErrorResponse);
    }

    // Upload to Cloudinary
    const uploadResult = await uploadPresentationToCloudinary(file);

    // Determine file_type for response
    const file_type =
      category === "pdf" ? "pdf" : category === "image" ? "image" : "mixed";

    res.status(200).json({
      status: "success",
      data: {
        file_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        file_type,
        original_name: file.name,
        format: uploadResult.format,
        resource_type: uploadResult.resource_type,
      },
    });
  } catch (error) {
    console.error("❌ Presentation upload failed:", error);
    next({
      statusCode: 500,
      status: "error",
      message: error instanceof Error ? error.message : "File upload failed.",
      stack: error instanceof Error ? error.stack : undefined,
    } as ErrorResponse);
  }
};

const handlePresentationDelete = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { file_url, file_type } = req.body;

    if (!file_url) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "file_url is required",
      } as ErrorResponse);
    }

    // Map file_type to FileCategory
    let category: FileCategory | undefined;
    if (file_type === "pdf") category = "pdf";
    else if (file_type === "image") category = "image";
    else if (file_type === "mixed") category = "presentation";

    const deleted = await deletePresentationFromCloudinary(file_url, category);

    res.status(200).json({
      status: "success",
      data: {
        deleted,
        message: deleted
          ? "File deleted successfully"
          : "File not found or already deleted",
      },
    });
  } catch (error) {
    console.error("❌ File deletion failed:", error);
    next({
      statusCode: 500,
      status: "error",
      message: "File deletion failed.",
    } as ErrorResponse);
  }
};

uploadRouter
  .route("/presentation")
  .post(asyncHandler(handlePresentationUpload))
  .delete(asyncHandler(handlePresentationDelete));

export default uploadRouter;
