import { Request, Response, NextFunction } from "express";
import PresentationQR from "./PresentationQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

export const createPresentationQR = async (
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
      title,
      description,
      presentation_type,
      file_url,
      file_type,
      file_size,
      total_pages,
      pages,
      viewer_settings,
      styling,
      branding,
      access_settings,
      tags,
      category,
    } = req.body;

    // Validation
    if (!title || !presentation_type || !file_type) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Title, presentation type, file  and file type are required",
      };
      return next(error);
    }

    const existingPresentation = await PresentationQR.findOne({
      user_id: userId,
      title: title.trim(),
    });

    if (existingPresentation) {
      const error: ErrorResponse = {
        statusCode: 409,
        status: "fail",
        message: "A presentation with this title already exists",
      };
      return next(error);
    }

    // Generate unique short URL
    const shortCode = title.trim();
    const baseUrl = process.env.FRONTEND_URL || "https://qrgenius.com";
    const qrCodeUrl = `${baseUrl}/presentation/${shortCode}`;
    const shortUrl = `${baseUrl}/p/${shortCode}`;

    // Generate QR Code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: styling?.primary_color || "#007bff",
        light: "#FFFFFF",
      },
    });

    // Hash password if access requires password
    let hashedPassword: string | undefined;
    if (access_settings?.requires_password && access_settings?.password) {
      hashedPassword = await bcrypt.hash(access_settings.password, 10);
    }

    // Create presentation QR
    const presentationQR = new PresentationQR({
      user_id: userId,
      title,
      description,
      presentation_type,
      file_url,
      file_type,
      file_size,
      total_pages,
      pages: pages || [],
      viewer_settings: viewer_settings || {},
      styling: styling || {},
      qr_code_url: qrCodeUrl,
      qr_code_image: qrCodeImage,
      short_url: shortUrl,
      branding,
      access_settings: {
        ...access_settings,
        password: hashedPassword,
        current_views: 0,
      },
      tags,
      category,
    });

    await presentationQR.save();

    // Remove password from response
    const response = presentationQR.toObject();
    if (response.access_settings.password) {
      delete response.access_settings.password;
    }

    res.status(201).json({
      status: "success",
      message: "Presentation QR Code created successfully",
      data: {
        presentation: response,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error creating presentation QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const getPresentationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Try to find by MongoDB ID first
    let presentation = await PresentationQR.findById(id);

    // If not found, try to find by short code in URL
    if (!presentation) {
      const baseUrl = process.env.FRONTEND_URL || "https://qrgenius.com";
      const shortUrl = `${baseUrl}/p/${id}`;
      presentation = await PresentationQR.findOne({ short_url: shortUrl });
    }

    if (!presentation) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Presentation not found",
      };
      return next(error);
    }

    // Check if presentation is active
    if (!presentation.is_active) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "This presentation is no longer active",
      };
      return next(error);
    }

    // Check expiry date
    if (
      presentation.access_settings.expiry_date &&
      new Date() > presentation.access_settings.expiry_date
    ) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "This presentation has expired",
      };
      return next(error);
    }

    // Check max views
    if (
      presentation.access_settings.max_views &&
      presentation.access_settings.current_views >=
        presentation.access_settings.max_views
    ) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "This presentation has reached its maximum view limit",
      };
      return next(error);
    }

    // Check password protection
    if (presentation.access_settings.requires_password) {
      if (!password) {
        const error: ErrorResponse = {
          statusCode: 401,
          status: "fail",
          message: "Password required to access this presentation",
        };
        return next(error);
      }

      const passwordDoc = await PresentationQR.findById(
        presentation._id,
      ).select("+access_settings.password");

      if (!passwordDoc?.access_settings.password) {
        const error: ErrorResponse = {
          statusCode: 500,
          status: "error",
          message: "Password configuration error",
        };
        return next(error);
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        passwordDoc.access_settings.password,
      );

      if (!isPasswordValid) {
        const error: ErrorResponse = {
          statusCode: 401,
          status: "fail",
          message: "Incorrect password",
        };
        return next(error);
      }
    }

    // Increment counters
    presentation.scan_count += 1;
    presentation.view_count += 1;
    presentation.access_settings.current_views += 1;
    presentation.last_viewed_at = new Date();
    await presentation.save();

    // Remove password from response
    const response = presentation.toObject();
    if (response.access_settings.password) {
      delete response.access_settings.password;
    }

    res.status(200).json({
      status: "success",
      data: {
        presentation: response,
      },
    });
  } catch (error) {
    // ADDED: CastError handling for consistency
    if (error instanceof mongoose.Error.CastError) {
      const errResponse: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "Invalid presentation ID format",
      };
      return next(errResponse);
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error fetching presentation",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

// Update other functions similarly...

/**
 * Get all presentations for a user
 */
export const getUserPresentations = async (
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

    // Filter options
    const filter: any = { user_id: userId };

    if (req.query.presentation_type) {
      filter.presentation_type = req.query.presentation_type;
    }

    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === "true";
    }

    const presentations = await PresentationQR.find(filter)
      .select("-access_settings.password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PresentationQR.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: presentations.length,
      data: {
        presentations,
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
      message: "Error fetching presentations",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Update presentation
 */
export const updatePresentation = async (
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

    const presentation = await PresentationQR.findOne({
      _id: id,
      user_id: userId,
    });

    if (!presentation) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message:
          "Presentation not found or you don't have permission to update it",
      };
      return next(error);
    }

    // Update allowed fields
    const allowedUpdates = [
      "title",
      "description",
      "presentation_type",
      "pages",
      "viewer_settings",
      "styling",
      "branding",
      "tags",
      "category",
      "is_active",
      "meta_title",
      "meta_description",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (presentation as any)[field] = req.body[field];
      }
    });

    // Update access settings separately to handle password
    if (req.body.access_settings) {
      const accessSettings = req.body.access_settings;

      if (accessSettings.requires_password && accessSettings.password) {
        accessSettings.password = await bcrypt.hash(
          accessSettings.password,
          10,
        );
      }

      presentation.access_settings = {
        ...presentation.access_settings,
        ...accessSettings,
      };
    }

    // Regenerate QR code if styling changed
    if (req.body.styling) {
      const qrCodeImage = await QRCode.toDataURL(presentation.qr_code_url, {
        width: 500,
        margin: 2,
        color: {
          dark: req.body.styling.primary_color || "#007bff",
          light: "#FFFFFF",
        },
      });
      presentation.qr_code_image = qrCodeImage;
    }

    await presentation.save();

    // Remove password from response
    const response = presentation.toObject();
    if (response.access_settings.password) {
      delete response.access_settings.password;
    }

    res.status(200).json({
      status: "success",
      message: "Presentation updated successfully",
      data: {
        presentation: response,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error updating presentation",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Delete presentation
 */
export const deletePresentation = async (
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

    const presentation = await PresentationQR.findOneAndDelete({
      _id: id,
      user_id: userId,
    });

    if (!presentation) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message:
          "Presentation not found or you don't have permission to delete it",
      };
      return next(error);
    }

    res.status(200).json({
      status: "success",
      message: "Presentation deleted successfully",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error deleting presentation",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Track page view for analytics
 */
export const trackPageView = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { page_number } = req.body;

    const presentation = await PresentationQR.findById(id);

    if (!presentation) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Presentation not found",
      };
      return next(error);
    }

    // Update page views
    const currentPageViews = presentation.page_views.get(page_number) || 0;
    presentation.page_views.set(page_number, currentPageViews + 1);

    await presentation.save();

    res.status(200).json({
      status: "success",
      message: "Page view tracked",
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error tracking page view",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get presentation analytics
 */
export const getPresentationAnalytics = async (
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

    const presentation = await PresentationQR.findOne({
      _id: id,
      user_id: userId,
    });

    if (!presentation) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "Presentation not found",
      };
      return next(error);
    }

    // Convert page_views Map to object for response
    const pageViewsObject: { [key: string]: number } = {};
    presentation.page_views.forEach((value, key) => {
      pageViewsObject[key] = value;
    });

    res.status(200).json({
      status: "success",
      data: {
        analytics: {
          scan_count: presentation.scan_count,
          view_count: presentation.view_count,
          last_viewed_at: presentation.last_viewed_at,
          total_pages: presentation.total_pages,
          page_views: pageViewsObject,
          current_views: presentation.access_settings.current_views,
          max_views: presentation.access_settings.max_views,
          expiry_date: presentation.access_settings.expiry_date,
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
