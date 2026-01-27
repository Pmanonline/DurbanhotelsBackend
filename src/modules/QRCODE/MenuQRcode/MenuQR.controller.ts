import { Request, Response, NextFunction } from "express";
import MenuQR, { MenuQRDocument } from "./MenuQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { createActivityLog } from "../Activity_log/activityLog.service";

/**
 * Create a new Menu QR Code
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
    const qrCodeUrl = `${baseUrl}/qrcode/menu-details?id=${shortCode}`;
    const shortUrl = `${baseUrl}/qrcode/menu-details?id=${shortCode}`;

    // Generate QR Code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: styling?.primary_color || "#3B82F6",
        light: "#FFFFFF",
      },
    });

    // Create menu with proper defaults for required fields
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
      styling: styling || {
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        font_family: "Inter",
        theme: "light",
        layout: "list",
      },
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
      description: `Restaurant menu QR for ${business_name}`,
      entity_type: "menu",
      entity_id: menuQR._id,
      entity_name: title,
      status: "success",
      metadata: {
        menu_type,
        categories_count: categories.length,
        is_public,
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

/**
 * Get a single menu by shortCode or _id
 */
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
        message: "Identifier (shortCode or ID) is required",
      });
    }

    console.log("🔍 Fetching menu with identifier:", id);

    let menu: MenuQRDocument | null = null;

    // Try shortCode first
    menu = await MenuQR.findOne({ shortCode: id });

    // Fallback to ObjectId
    if (!menu && mongoose.Types.ObjectId.isValid(id)) {
      menu = await MenuQR.findById(id);
    }

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
 * Update menu - FIXED with proper type handling
 */
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

    // Store old values for activity log
    const oldTitle = menu.title;

    // Define allowed top-level fields
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

    // Update simple fields
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (menu as any)[field] = req.body[field];
      }
    });

    // Handle nested styling - FIXED
    if (req.body.styling) {
      const currentStyling = menu.styling || {
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        font_family: "Inter",
        theme: "light" as const,
        layout: "list" as const,
      };

      menu.styling = {
        ...currentStyling,
        ...req.body.styling,
      };
    }

    // Handle nested contact_info - FIXED
    if (req.body.contact_info) {
      const currentContactInfo = menu.contact_info || {};

      menu.contact_info = {
        ...currentContactInfo,
        ...req.body.contact_info,
      };

      // Handle nested social_media
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

    // Regenerate QR code if styling changed
    if (req.body.styling?.primary_color) {
      try {
        const qrCodeImage = await QRCode.toDataURL(menu.qr_code_url, {
          width: 500,
          margin: 2,
          color: {
            dark: req.body.styling.primary_color || "#3B82F6",
            light: "#FFFFFF",
          },
        });
        menu.qr_code_image = qrCodeImage;
        console.log("✅ QR code regenerated with new color");
      } catch (qrError) {
        console.error("⚠️ Failed to regenerate QR code:", qrError);
      }
    }

    // Mark modified fields
    menu.markModified("styling");
    menu.markModified("contact_info");
    menu.markModified("business_hours");
    menu.markModified("categories");

    await menu.save();

    console.log("✅ Menu updated successfully:", menu._id);

    // 📝 Create activity log
    await createActivityLog({
      user_id: userId,
      activity_type: "menu_updated",
      title: "QR Code Updated",
      description: `Updated redirect URL for ${menu.title}`,
      entity_type: "menu",
      entity_id: menu._id,
      entity_name: menu.title,
      status: "info",
      metadata: {
        updated_fields: Object.keys(req.body),
        old_title: oldTitle,
        new_title: menu.title,
      },
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Menu updated successfully",
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error("❌ Error updating menu:", error);

    // Log failed activity
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
