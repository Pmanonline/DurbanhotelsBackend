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

    // Optional: still check if this exact title already exists for this user
    // (prevents accidental duplicates, but allows same title later if needed)
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

    // Generate timestamp only for the shortCode / slug (not stored in title)
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 12);

    // Create unique shortCode: title + timestamp
    let shortCodeBase = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // keep letters, numbers, spaces, hyphens
      .replace(/\s+/g, "-") // spaces → single hyphen
      .replace(/-+/g, "-") // no double hyphens
      .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens

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
        dark: styling?.primary_color || "#000000",
        light: "#FFFFFF",
      },
    });

    const menuQR = new MenuQR({
      user_id: userId,
      title,
      shortCode, // ← save it here
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
        shortCode,
        qrCodeUrl,
        shortUrl,
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
// export const getMenuById = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const { id } = req.params;

//     console.log("🔍 Fetching menu with ID:", id);

//     let menu = null;

//     // Try to find by MongoDB ID
//     menu = await MenuQR.findById(id);

//     // If not found, try to find by short code
//     if (!menu) {
//       const baseUrl = process.env.FRONTEND_URL;
//       const shortUrl = `${baseUrl}/m/${id}`;
//       menu = await MenuQR.findOne({ short_url: shortUrl });
//     }

//     if (!menu) {
//       console.log("❌ Menu not found");
//       const error: ErrorResponse = {
//         statusCode: 404,
//         status: "fail",
//         message: "Menu not found",
//       };
//       return next(error);
//     }

//     console.log("✅ Menu found:", {
//       id: menu._id,
//       title: menu.title,
//       is_active: menu.is_active,
//       is_public: menu.is_public,
//       user_id: menu.user_id,
//     });

//     res.status(200).json({
//       status: "success",
//       data: {
//         menu,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error in getMenuById:", error);

//     // Handle specific MongoDB errors
//     if (error instanceof mongoose.Error.CastError) {
//       const errResponse: ErrorResponse = {
//         statusCode: 400,
//         status: "fail",
//         message: "Invalid menu ID format",
//       };
//       return next(errResponse);
//     }

//     const errResponse: ErrorResponse = {
//       statusCode: 500,
//       status: "error",
//       message: "Error fetching menu",
//       stack: error instanceof Error ? { stack: error.stack } : undefined,
//     };
//     next(errResponse);
//   }
// };

/**
 * Get a single menu by shortCode (preferred) or MongoDB _id (fallback)
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

    // 1. First try as shortCode (most common case for public/QRs)
    menu = await MenuQR.findOne({ shortCode: id });

    // 2. If not found and it looks like a valid ObjectId → try _id
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

    // Optional: Track public scans (skip for internal/admin fetches if needed)
    // You can add middleware or query param to skip this if desired
    if (menu.is_public) {
      menu.scan_count += 1;
      menu.last_scanned_at = new Date();
      await menu.save({ validateBeforeSave: false }); // fast update, skip full validation
    }

    console.log("✅ Menu found:", {
      _id: menu._id,
      shortCode: menu.shortCode,
      title: menu.title,
      is_active: menu.is_active,
      is_public: menu.is_public,
      user_id: menu.user_id?.toString(),
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
