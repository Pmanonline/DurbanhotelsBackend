import { Request, Response, NextFunction } from "express";
import MenuQR, { MenuQRDocument } from "./MenuQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import mongoose from "mongoose";

/**
 * Create a new Menu QR Code
 */
export const createMenuQR = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // const AuthUSerID = userId?.userData?._id || userId?._id;
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
      title,
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
    if (!title || !business_name || !categories || categories.length === 0) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Title, business name, and at least one category are required",
      };
      return next(error);
    }

    // / Check for duplicate menu with the same title and business name
    const existingMenu = await MenuQR.findOne({
      user_id: userId,
      title: title.trim(),
    });

    if (existingMenu) {
      const error: ErrorResponse = {
        statusCode: 409,
        status: "fail",
        message: "A menu with this title already exists",
      };
      return next(error);
    }

    // Generate unique short URL
    const shortCode = title.trim();
    const baseUrl = process.env.FRONTEND_URL || "https://qrgenius.com";
    const qrCodeUrl = `${baseUrl}/menu/${shortCode}`;
    const shortUrl = `${baseUrl}/m/${shortCode}`;

    // Generate QR Code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: styling?.primary_color || "#000000",
        light: "#FFFFFF",
      },
    });

    // Create menu QR
    const menuQR = new MenuQR({
      user_id: userId,
      title,
      description,
      business_name,
      business_logo,
      menu_type: menu_type || "restaurant",
      categories,
      qr_code_url: qrCodeUrl,
      qr_code_image: qrCodeImage,
      short_url: shortUrl,
      styling: styling || {},
      contact_info,
      business_hours,
      is_public: is_public !== undefined ? is_public : true,
    });

    await menuQR.save();

    res.status(201).json({
      status: "success",
      message: "Menu QR Code created successfully",
      data: {
        menu: menuQR,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error creating menu QR code",
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
 * Get a single menu by ID or short code
 */
/**
 * Get a single menu by ID or short code
 */
export const getMenuById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    console.log("🔍 Fetching menu with ID:", id);

    let menu = null;

    // Try to find by MongoDB ID
    menu = await MenuQR.findById(id);

    // If not found, try to find by short code
    if (!menu) {
      const baseUrl = process.env.FRONTEND_URL || "https://qrgenius.com";
      const shortUrl = `${baseUrl}/m/${id}`;
      menu = await MenuQR.findOne({ short_url: shortUrl });
    }

    if (!menu) {
      console.log("❌ Menu not found");
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found",
      };
      return next(error);
    }

    console.log("✅ Menu found:", {
      id: menu._id,
      title: menu.title,
      is_active: menu.is_active,
      is_public: menu.is_public,
      user_id: menu.user_id,
    });

    res.status(200).json({
      status: "success",
      data: {
        menu,
      },
    });
  } catch (error) {
    console.error("❌ Error in getMenuById:", error);

    // Handle specific MongoDB errors
    if (error instanceof mongoose.Error.CastError) {
      const errResponse: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid menu ID format",
      };
      return next(errResponse);
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching menu",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Update menu
 */
export const updateMenu = async (
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
        message: "Menu not found or you don't have permission to update it",
      };
      return next(error);
    }

    // Update fields
    const allowedUpdates = [
      "title",
      "description",
      "business_name",
      "business_logo",
      "menu_type",
      "categories",
      "styling",
      "contact_info",
      "business_hours",
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

    // Regenerate QR code if styling changed
    if (req.body.styling) {
      const qrCodeImage = await QRCode.toDataURL(menu.qr_code_url, {
        width: 500,
        margin: 2,
        color: {
          dark: req.body.styling.primary_color || "#000000",
          light: "#FFFFFF",
        },
      });
      menu.qr_code_image = qrCodeImage;
    }

    await menu.save();

    res.status(200).json({
      status: "success",
      message: "Menu updated successfully",
      data: {
        menu,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating menu",
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

    const menu = await MenuQR.findOneAndDelete({ _id: id, user_id: userId });

    if (!menu) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Menu not found or you don't have permission to delete it",
      };
      return next(error);
    }

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
