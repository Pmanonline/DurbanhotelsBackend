import { Request, Response, NextFunction } from "express";
import MenuQR, { MenuQRDocument } from "./MenuQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { createActivityLog } from "../Activity_log/activityLog.service";
import QRCodeStyling from "qr-code-styling";
import { createCanvas, Canvas } from "canvas";
import { errorHandler } from "../../../utilities/errorHandler.util";

/**
 * Generate QR Code with advanced styling options
 */

const generateStyledQRCode = async (
  url: string,
  qrDesign?: any,
): Promise<string> => {
  try {
    const design = qrDesign || {};

    console.log("🎨 Generating SCANNABLE QR with design:", {
      frame: design.frame,
      primaryColor: design.qr_primary_color,
      backgroundColor: design.qr_background_color,
      errorCorrection: design.error_correction,
    });

    const qrSize = design.qr_size || 1000;
    const margin = design.margin || 4;
    const primaryColor = design.qr_primary_color || "#000000";
    const backgroundColor = design.qr_background_color || "#FFFFFF";
    const frame = design.frame || "none";
    const frameColor = design.frame_color || "#000000";
    const errorCorrection = design.error_correction || "H";

    // Calculate frame width
    const frameWidth =
      frame === "thick"
        ? 60
        : frame === "thin"
          ? 20
          : frame === "none"
            ? 0
            : 40;
    const canvasSize = qrSize + frameWidth * 2;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext("2d");

    // ✅ FIX 1: ALWAYS fill entire canvas with background first (prevents transparency)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Step 1: Draw frame if needed (AROUND the QR, not inside it)
    if (frame !== "none") {
      ctx.fillStyle = frameColor;

      switch (frame) {
        case "rounded":
          const radius = 40;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(canvasSize - radius, 0);
          ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius);
          ctx.lineTo(canvasSize, canvasSize - radius);
          ctx.quadraticCurveTo(
            canvasSize,
            canvasSize,
            canvasSize - radius,
            canvasSize,
          );
          ctx.lineTo(radius, canvasSize);
          ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.fill();
          break;

        case "shadow":
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 8;
          ctx.shadowOffsetY = 8;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.shadowColor = "transparent";
          break;

        default:
          ctx.fillRect(0, 0, canvasSize, canvasSize);
      }

      // ✅ FIX 2: Redraw background AFTER frame to ensure QR area is clean
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(frameWidth, frameWidth, qrSize, qrSize);
    }

    // Step 3: Generate SIMPLE, SCANNABLE QR code using native library
    const qrOptions = {
      errorCorrectionLevel: errorCorrection,
      margin: 0,
      width: qrSize,
      color: {
        dark: primaryColor,
        light: backgroundColor,
      },
    };

    // Generate QR to a temporary canvas
    const tempCanvas = createCanvas(qrSize, qrSize);
    await QRCode.toCanvas(tempCanvas, url, qrOptions);

    // Draw QR onto main canvas
    ctx.drawImage(tempCanvas, frameWidth, frameWidth);

    // Step 4: Add logo if provided
    if (design.logo_image && ["Q", "H"].includes(errorCorrection)) {
      try {
        const { loadImage } = require("canvas");
        const logo = await loadImage(design.logo_image);

        const logoSizePercent =
          design.logo_size === "small"
            ? 15
            : design.logo_size === "large"
              ? 20
              : 17;
        const logoWidth = qrSize * (logoSizePercent / 100);
        const logoHeight = qrSize * (logoSizePercent / 100);
        const logoX = frameWidth + (qrSize - logoWidth) / 2;
        const logoY = frameWidth + (qrSize - logoHeight) / 2;

        const padding = logoWidth * 0.15;
        const bgSize = logoWidth + padding * 2;
        const bgX = logoX - padding;
        const bgY = logoY - padding;
        const radius = bgSize * 0.1;

        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.moveTo(bgX + radius, bgY);
        ctx.lineTo(bgX + bgSize - radius, bgY);
        ctx.quadraticCurveTo(bgX + bgSize, bgY, bgX + bgSize, bgY + radius);
        ctx.lineTo(bgX + bgSize, bgY + bgSize - radius);
        ctx.quadraticCurveTo(
          bgX + bgSize,
          bgY + bgSize,
          bgX + bgSize - radius,
          bgY + bgSize,
        );
        ctx.lineTo(bgX + radius, bgY + bgSize);
        ctx.quadraticCurveTo(bgX, bgY + bgSize, bgX, bgY + bgSize - radius);
        ctx.lineTo(bgX, bgY + radius);
        ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
        ctx.closePath();
        ctx.fill();

        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

        console.log("✅ Logo added:", {
          size: `${logoSizePercent}%`,
          errorCorrection,
        });
      } catch (error) {
        console.warn("⚠️ Could not load logo:", error);
      }
    }

    // ✅ FIX 3: Use Canvas static property correctly
    const buffer = canvas.toBuffer("image/png", {
      compressionLevel: 6,
      filters: Canvas.PNG_FILTER_NONE, // ✅ FIXED: Use static property
    });
    const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;

    console.log("✅ SCANNABLE QR code generated:", {
      size: `${qrSize}x${qrSize}`,
      frame: frame,
      hasLogo: !!design.logo_image,
      errorCorrection,
      dataLength: base64Image.length,
    });

    return base64Image;
  } catch (error) {
    console.error("❌ Error generating QR code:", error);
    console.warn("⚠️ Falling back to basic QR code");
    return await generateBasicQRCodeFallback(url, qrDesign);
  }
};

// Fallback function
async function generateBasicQRCodeFallback(
  url: string,
  qrDesign?: any,
): Promise<string> {
  const design = qrDesign || {};
  const options = {
    width: design.qr_size || 1000,
    margin: design.margin || 4,
    errorCorrectionLevel: design.error_correction || "H",
    color: {
      dark: design.qr_primary_color || "#000000",
      light: design.qr_background_color || "#FFFFFF",
    },
    type: "image/png" as const,
  };

  const base64 = await QRCode.toDataURL(url, options);
  console.log("✅ Fallback QR generated, length:", base64.length);
  return base64;
}

export const updateMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    console.log("🔄 Updating menu:", id);
    console.log("📦 Update payload:", JSON.stringify(req.body, null, 2));

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    // Find menu
    let menu: MenuQRDocument | null = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      menu = await MenuQR.findOne({ _id: id, user_id: userId });
    }

    if (!menu) {
      menu = await MenuQR.findOne({ shortCode: id, user_id: userId });
    }

    if (!menu) {
      console.log("❌ Menu not found or unauthorized");
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found or you don't have permission to update it",
      };
      return next(error);
    }

    const oldTitle = menu.title;
    const oldQRTemplate = menu.styling?.qr_design?.qr_template;

    // ✅ FIX 4: Track if business_logo changed
    const logoChanged =
      req.body.business_logo !== undefined &&
      req.body.business_logo !== menu.business_logo;

    // Update simple fields
    const allowedUpdates = [
      "title",
      "description",
      "business_name",
      "business_logo",
      "menu_type",
      "categories",
      "is_active",
      "is_public",
      "meta_title",
      "meta_description",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (menu as any)[field] = req.body[field];
      }
    });

    let qrNeedsRegeneration = false;

    if (req.body.styling) {
      const currentStyling = menu.styling || {
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        font_family: "Inter",
        font_size: "medium",
        font_weight: "regular",
        letter_spacing: "normal",
        theme: "light" as const,
        layout: "list" as const,
        qr_design: {
          qr_template: "classic",
          dot_style: "square",
          corner_style: "square",
          frame: "none",
          body_pattern: "single",
          qr_primary_color: "#000000",
          qr_secondary_color: "#000000",
          qr_background_color: "#FFFFFF",
          error_correction: "M",
          margin: 2,
          qr_size: 1000,
        },
      };

      menu.styling = {
        ...currentStyling,
        ...req.body.styling,
      };

      if (req.body.styling.qr_design) {
        const currentQRDesign = currentStyling.qr_design || {};

        menu.styling.qr_design = {
          ...currentQRDesign,
          ...req.body.styling.qr_design,
        };

        // ✅ FIX 5: Check if ANY QR design property changed
        const qrDesignChanged =
          req.body.styling.qr_design.qr_template ||
          req.body.styling.qr_design.qr_primary_color ||
          req.body.styling.qr_design.qr_background_color ||
          req.body.styling.qr_design.dot_style ||
          req.body.styling.qr_design.corner_style ||
          req.body.styling.qr_design.frame ||
          req.body.styling.qr_design.frame_color ||
          req.body.styling.qr_design.body_pattern ||
          req.body.styling.qr_design.logo_image ||
          req.body.styling.qr_design.logo_size ||
          req.body.styling.qr_design.qr_size ||
          req.body.styling.qr_design.margin ||
          logoChanged; // ✅ Also regenerate if logo changed

        if (qrDesignChanged) {
          qrNeedsRegeneration = true;
        }
      }
    }

    // ✅ FIX 6: ALWAYS regenerate if logo changed
    if (logoChanged && !qrNeedsRegeneration) {
      qrNeedsRegeneration = true;
    }

    // Handle contact_info
    if (req.body.contact_info) {
      const currentContactInfo = menu.contact_info || {};

      menu.contact_info = {
        ...currentContactInfo,
        ...req.body.contact_info,
      };

      if (req.body.contact_info.social_media) {
        const currentSocialMedia = menu.contact_info?.social_media || {};
        menu.contact_info.social_media = {
          ...currentSocialMedia,
          ...req.body.contact_info.social_media,
        };
      }
    }

    if (req.body.business_hours !== undefined) {
      menu.business_hours = req.body.business_hours;
    }

    // ✅ FIX 7: Regenerate QR code with UPDATED logo
    if (qrNeedsRegeneration) {
      try {
        console.log("🎨 Regenerating QR code with new design...");

        // ✅ FIX 8: Ensure logo_image is updated in qr_design
        if (menu.business_logo && menu.styling?.qr_design) {
          menu.styling.qr_design.logo_image = menu.business_logo;
        }

        const qrCodeImage = await generateStyledQRCode(
          menu.qr_code_url,
          menu.styling.qr_design,
        );

        menu.qr_code_image = qrCodeImage;

        console.log("✅ QR code regenerated successfully with:", {
          template: menu.styling.qr_design?.qr_template,
          primary_color: menu.styling.qr_design?.qr_primary_color,
          frame: menu.styling.qr_design?.frame,
          hasLogo: !!menu.business_logo,
          logoInDesign: !!menu.styling.qr_design?.logo_image,
          imageLength: qrCodeImage.length,
        });
      } catch (qrError) {
        console.error("⚠️ Failed to regenerate QR code:", qrError);
      }
    }

    // ✅ FIX 9: Mark all modified fields
    menu.markModified("styling");
    menu.markModified("styling.qr_design");
    menu.markModified("contact_info");
    menu.markModified("business_hours");
    menu.markModified("categories");
    menu.markModified("qr_code_image");

    await menu.save();

    console.log("✅ Menu updated successfully:", menu._id);

    // Create activity log
    const updatedFields = Object.keys(req.body);
    const qrDesignUpdated =
      updatedFields.includes("styling") && req.body.styling?.qr_design;

    await createActivityLog({
      user_id: userId,
      activity_type: "menu_updated",
      title: qrDesignUpdated ? "QR Design Updated" : "Menu Updated",
      description: qrDesignUpdated
        ? `Updated QR design for ${menu.title} to ${menu.styling.qr_design?.qr_template} template`
        : `Updated menu: ${menu.title}`,
      entity_type: "menu",
      entity_id: menu._id,
      entity_name: menu.title,
      status: "success",
      metadata: {
        updated_fields: updatedFields,
        old_title: oldTitle,
        new_title: menu.title,
        old_qr_template: oldQRTemplate,
        new_qr_template: menu.styling.qr_design?.qr_template,
        qr_regenerated: qrNeedsRegeneration,
        logo_updated: logoChanged,
      },
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Menu updated successfully",
      data: {
        menu,
        qr_regenerated: qrNeedsRegeneration,
      },
    });
  } catch (error) {
    console.error("❌ Error updating menu:", error);

    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    if (userId) {
      await createActivityLog({
        user_id: userId,
        activity_type: "menu_updated",
        title: "Menu Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        entity_id: id,
        status: "failed",
        req,
      });
    }

    let message = "Error updating menu";
    if (error instanceof mongoose.Error.ValidationError) {
      message = `Validation error: ${Object.values(error.errors)
        .map((e) => e.message)
        .join(", ")}`;
    } else if (error instanceof Error) {
      message = error.message;
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message,
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Draw styled QR code on canvas
 */
async function drawStyledQR(
  ctx: any,
  url: string,
  offsetX: number,
  size: number,
  options: any,
) {
  const {
    primaryColor,
    secondaryColor,
    backgroundColor,
    dotStyle,
    cornerStyle,
    bodyPattern,
    gradientType,
    gradientRotation,
    errorCorrection,
  } = options;

  // Generate QR code matrix
  const qr = await QRCode.create(url, {
    errorCorrectionLevel: errorCorrection,
  });
  const modules = qr.modules;
  const moduleCount = modules.size;
  const moduleSize = size / moduleCount;

  // Create gradient if needed
  let gradient;
  if (bodyPattern === "gradient") {
    const centerX = offsetX + size / 2;
    const centerY = offsetX + size / 2;

    if (gradientType === "radial") {
      gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        size / 2,
      );
    } else {
      const angle = (gradientRotation || 0) * (Math.PI / 180);
      const x1 = centerX - (Math.cos(angle) * size) / 2;
      const y1 = centerY - (Math.sin(angle) * size) / 2;
      const x2 = centerX + (Math.cos(angle) * size) / 2;
      const y2 = centerY + (Math.sin(angle) * size) / 2;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, secondaryColor);
  }

  // Draw each module with styling
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const isDark = modules.get(row, col);
      if (!isDark) continue;

      const x = offsetX + col * moduleSize;
      const y = offsetX + row * moduleSize;

      // Use gradient or primary color
      ctx.fillStyle = gradient || primaryColor;

      // Determine if this is a corner module
      const isCorner = isCornerModule(row, col, moduleCount);

      // Apply dot style
      const style = isCorner ? cornerStyle : dotStyle;

      switch (style) {
        case "rounded":
        case "dots":
          ctx.beginPath();
          ctx.arc(
            x + moduleSize / 2,
            y + moduleSize / 2,
            moduleSize / 2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          break;

        case "heart":
          drawHeart(
            ctx,
            x + moduleSize / 2,
            y + moduleSize / 2,
            moduleSize / 3,
          );
          break;

        case "star":
          drawStar(
            ctx,
            x + moduleSize / 2,
            y + moduleSize / 2,
            moduleSize / 2.5,
            5,
          );
          break;

        case "diamond":
          ctx.beginPath();
          ctx.moveTo(x + moduleSize / 2, y);
          ctx.lineTo(x + moduleSize, y + moduleSize / 2);
          ctx.lineTo(x + moduleSize / 2, y + moduleSize);
          ctx.lineTo(x, y + moduleSize / 2);
          ctx.closePath();
          ctx.fill();
          break;

        default: // square
          ctx.fillRect(x, y, moduleSize, moduleSize);
      }
    }
  }
}

/**
 * Check if a module is part of a corner pattern
 */
function isCornerModule(row: number, col: number, size: number): boolean {
  const cornerSize = 7;

  // Top-left corner
  if (row < cornerSize && col < cornerSize) return true;

  // Top-right corner
  if (row < cornerSize && col >= size - cornerSize) return true;

  // Bottom-left corner
  if (row >= size - cornerSize && col < cornerSize) return true;

  return false;
}

/**
 * Draw a heart shape
 */
function drawHeart(ctx: any, x: number, y: number, size: number) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(
    x - size / 2,
    y + (size + topCurveHeight) / 2,
    x,
    y + (size + topCurveHeight) / 2,
    x,
    y + size,
  );
  ctx.bezierCurveTo(
    x,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + topCurveHeight,
  );
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.fill();
}

/**
 * Draw a star shape
 */
function drawStar(
  ctx: any,
  x: number,
  y: number,
  radius: number,
  points: number,
) {
  const step = Math.PI / points;
  ctx.beginPath();
  ctx.moveTo(x, y - radius);

  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? radius : radius / 2;
    const angle = i * step - Math.PI / 2;
    ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Create a new Menu QR Code with enhanced styling
 */
export const createMenuQR = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const {
      title: rawTitle,
      description,
      business_name,
      business_logo,
      menu_type,
      categories,
      styling,
      contact_info,
      business_hours,
      is_public,
    } = req.body;

    // Validation
    if (!rawTitle || !business_name || !categories || categories.length === 0) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Title, business name, and at least one category are required",
      };
      return next(error);
    }

    const title = rawTitle.trim();

    // Optional: check if title exists
    const existingMenu = await MenuQR.findOne({
      user_id: userId,
      title,
    });

    if (existingMenu) {
      const error: ErrorResponse = {
        statusCode: 409,
        status: "fail",
        message: "You already have a menu with this exact title",
      };
      return next(error);
    }

    // Generate shortCode with timestamp
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 12);

    let shortCodeBase = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!shortCodeBase) {
      shortCodeBase = "menu";
    }

    const shortCode = `${shortCodeBase}-${timestamp}`;

    const baseUrl = process.env.FRONTEND_URL;
    const qrCodeUrl = `${baseUrl}/qrcode/menu-details?id=${shortCode}&from=qr`;
    const shortUrl = `${baseUrl}/qrcode/menu-details?id=${shortCode}`;

    // Prepare styling with defaults
    const menuStyling = {
      primary_color: styling?.primary_color || "#3B82F6",
      secondary_color: styling?.secondary_color || "#6B7280",
      font_family: styling?.font_family || "Inter",
      font_size: styling?.font_size || "medium",
      font_weight: styling?.font_weight || "regular",
      letter_spacing: styling?.letter_spacing || "normal",
      theme: styling?.theme || "light",
      layout: styling?.layout || "list",
      qr_design: {
        qr_template: styling?.qr_design?.qr_template || "classic",
        dot_style: styling?.qr_design?.dot_style || "square",
        corner_style: styling?.qr_design?.corner_style || "square",
        frame: styling?.qr_design?.frame || "none",
        frame_color: styling?.qr_design?.frame_color || "#000000",
        frame_text: styling?.qr_design?.frame_text || "",
        body_pattern: styling?.qr_design?.body_pattern || "single",
        qr_primary_color: styling?.qr_design?.qr_primary_color || "#000000",
        qr_secondary_color: styling?.qr_design?.qr_secondary_color || "#000000",
        qr_background_color:
          styling?.qr_design?.qr_background_color || "#FFFFFF",
        gradient_type: styling?.qr_design?.gradient_type || "linear",
        gradient_rotation: styling?.qr_design?.gradient_rotation || 0,
        logo_image: styling?.qr_design?.logo_image || business_logo || "",
        logo_size: styling?.qr_design?.logo_size || "medium",
        logo_style: styling?.qr_design?.logo_style || "rounded",
        error_correction: styling?.qr_design?.error_correction || "M",
        margin: styling?.qr_design?.margin || 2,
        qr_size: styling?.qr_design?.qr_size || 1000,
      },
    };

    // Generate QR Code with styling
    const qrCodeImage = await generateStyledQRCode(
      qrCodeUrl,
      menuStyling.qr_design,
    );

    console.log("✅ QR Code generated with styling:", {
      template: menuStyling.qr_design.qr_template,
      primary_color: menuStyling.qr_design.qr_primary_color,
      frame: menuStyling.qr_design.frame,
    });

    // Create menu with enhanced styling
    const menuQR = new MenuQR({
      user_id: userId,
      title,
      shortCode,
      description,
      business_name,
      business_logo,
      menu_type: menu_type || "restaurant",
      categories,
      qr_code_url: qrCodeUrl,
      qr_code_image: qrCodeImage,
      short_url: shortUrl,
      styling: menuStyling,
      contact_info: contact_info || {},
      business_hours,
      is_public: is_public !== undefined ? is_public : true,
    });

    await menuQR.save();

    // 📝 Create activity log
    await createActivityLog({
      user_id: userId,
      activity_type: "menu_created",
      title: "Menu QR Code Created",
      description: `Restaurant menu QR for ${business_name} with ${menuStyling.qr_design.qr_template} template`,
      entity_type: "menu",
      entity_id: menuQR._id,
      entity_name: title,
      status: "success",
      metadata: {
        menu_type,
        categories_count: categories.length,
        is_public,
        qr_template: menuStyling.qr_design.qr_template,
        qr_frame: menuStyling.qr_design.frame,
      },
      req,
    });

    res.status(201).json({
      status: "success",
      message: "Menu QR Code created successfully",
      data: {
        menu: menuQR,
        shortCode,
        qrCodeUrl,
        shortUrl,
      },
    });
  } catch (error) {
    console.error("❌ Error creating menu:", error);

    // Log failed activity
    const userId = req.user?._id || req.user?.id;
    if (userId) {
      await createActivityLog({
        user_id: userId,
        activity_type: "menu_created",
        title: "Menu QR Code Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "failed",
        req,
      });
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message:
        error instanceof Error ? error.message : "Error creating menu QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get all menus for a user
 */
export const getUserMenus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const menus = await MenuQR.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MenuQR.countDocuments({ user_id: userId });

    res.status(200).json({
      status: "success",
      results: menus.length,
      data: {
        menus,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching menus:", error);
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching menus",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const getMenuById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "Identifier (shortCode, name, title or ID) is required",
      });
    }

    console.log("🔍 Fetching menu with identifier:", id);

    // Build dynamic OR conditions
    const conditions: any[] = [
      { shortCode: id },
      { name: { $regex: `^${id}$`, $options: "i" } }, // case-insensitive
      { title: { $regex: `^${id}$`, $options: "i" } }, // case-insensitive
    ];

    // If valid Mongo ObjectId, add _id condition
    if (mongoose.Types.ObjectId.isValid(id)) {
      conditions.push({ _id: id });
    }

    const menu: MenuQRDocument | null = await MenuQR.findOne({
      $or: conditions,
    });

    if (!menu) {
      console.log("❌ Menu not found for identifier:", id);
      return next({
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      });
    }

    // Track scans for public menus
    if (menu.is_public) {
      menu.scan_count += 1;
      menu.last_scanned_at = new Date();
      await menu.save({ validateBeforeSave: false });

      // 📝 Log QR scan activity
      await createActivityLog({
        user_id: menu.user_id,
        activity_type: "qr_scanned",
        title: "QR Code Scanned",
        description: `Menu "${menu.title}" was scanned`,
        entity_type: "qr_code",
        entity_id: menu._id,
        entity_name: menu.title,
        status: "info",
        metadata: {
          scan_count: menu.scan_count,
        },
        req,
      });
    }

    console.log("✅ Menu found:", {
      _id: menu._id,
      shortCode: menu.shortCode,
      title: menu.title,
      scan_count: menu.scan_count,
    });

    res.status(200).json({
      status: "success",
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching menu:", error);

    if (error instanceof mongoose.Error.CastError) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "Invalid identifier format",
      });
    }

    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching menu",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Delete menu
 */
export const deleteMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const menu = await MenuQR.findOne({ _id: id, user_id: userId });

    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found or you don't have permission to delete it",
      };
      return next(error);
    }

    const menuTitle = menu.title;
    await menu.deleteOne();

    // 📝 Create activity log
    await createActivityLog({
      user_id: userId,
      activity_type: "menu_deleted",
      title: "Menu Deleted",
      description: `Deleted menu: ${menuTitle}`,
      entity_type: "menu",
      entity_id: id,
      entity_name: menuTitle,
      status: "success",
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Menu deleted successfully",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error deleting menu",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get menu analytics
 */
export const getMenuAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      };
      return next(error);
    }

    const menu = await MenuQR.findOne({ _id: id, user_id: userId });

    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      };
      return next(error);
    }

    // 📝 Log analytics download
    await createActivityLog({
      user_id: userId,
      activity_type: "analytics_downloaded",
      title: "Analytics Downloaded",
      description: `Monthly scan report for ${menu.title}`,
      entity_type: "analytics",
      entity_id: menu._id,
      entity_name: menu.title,
      status: "success",
      metadata: {
        scan_count: menu.scan_count,
        qr_template: menu.styling.qr_design?.qr_template,
      },
      req,
    });

    res.status(200).json({
      status: "success",
      data: {
        analytics: {
          scan_count: menu.scan_count,
          last_scanned_at: menu.last_scanned_at,
          is_active: menu.is_active,
          total_categories: menu.categories.length,
          total_items: menu.categories.reduce(
            (acc, cat) => acc + cat.items.length,
            0,
          ),
          qr_design: menu.styling.qr_design,
        },
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching analytics",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
