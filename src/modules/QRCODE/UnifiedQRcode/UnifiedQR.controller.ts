import { Request, Response, NextFunction } from "express";
import UnifiedQR, {
  UnifiedQRDocument,
} from "../../QRCODE/UnifiedQRcode/UnifiedQR.model";
import { ErrorResponse } from "../../../utilities/errorHandler.util";
import QRService from "./UnifiedQR.Service";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createActivityLog } from "../Activity_log/activityLog.service";
import crypto from "crypto";

const getClientIP = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first entry is the client
    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0];
    return first.trim();
  }
  return (
    (req.headers["x-real-ip"] as string) ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

const buildScanFingerprint = (req: Request): string => {
  const ip = getClientIP(req);
  const ua = req.headers["user-agent"] || "unknown";
  const lang = req.headers["accept-language"] || "unknown";
  const day = new Date().toISOString().slice(0, 10);

  const raw = `${ip}|${ua}|${lang}|${day}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
};

const checkAndRecordScan = (
  qr: any,
  req: Request,
): { isUnique: boolean; fingerprint: string } => {
  const fingerprint = buildScanFingerprint(req);
  const today = new Date().toISOString().slice(0, 10);

  // Initialise the map if it doesn't exist yet (first scan ever)
  if (!qr.daily_scan_fingerprints) {
    qr.daily_scan_fingerprints = {};
  }

  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const keysToDelete = Object.keys(qr.daily_scan_fingerprints).filter(
    (k) => k !== today && k !== yesterday,
  );
  keysToDelete.forEach((k) => delete qr.daily_scan_fingerprints[k]);

  // Get today's fingerprint list (may be empty/missing)
  const todayFingerprints: string[] = qr.daily_scan_fingerprints[today] || [];

  // Check if this device already scanned today
  if (todayFingerprints.includes(fingerprint)) {
    return { isUnique: false, fingerprint };
  }

  // New unique scan — record it
  qr.daily_scan_fingerprints[today] = [...todayFingerprints, fingerprint];

  return { isUnique: true, fingerprint };
};

/**
 * Generate QR data string based on type
 */
const generateQRDataString = (qrDoc: UnifiedQRDocument): string => {
  switch (qrDoc.qr_type) {
    case "url":
      return qrDoc.url_data?.url || "";

    case "wifi":
      const wifi = qrDoc.wifi_data!;
      return `WIFI:T:${wifi.security};S:${wifi.ssid};P:${wifi.password};H:${wifi.hidden ? "true" : "false"};;`;

    case "vcard":
      const vc = qrDoc.vcard_data!;
      let vcard = "BEGIN:VCARD\nVERSION:3.0\n";
      vcard += `N:${vc.lastName};${vc.firstName};;;\n`;
      vcard += `FN:${vc.firstName} ${vc.lastName}\n`;
      if (vc.organization) vcard += `ORG:${vc.organization}\n`;
      if (vc.title) vcard += `TITLE:${vc.title}\n`;
      if (vc.phone) vcard += `TEL;TYPE=WORK,VOICE:${vc.phone}\n`;
      if (vc.mobile) vcard += `TEL;TYPE=CELL:${vc.mobile}\n`;
      if (vc.email) vcard += `EMAIL:${vc.email}\n`;
      if (vc.website) vcard += `URL:${vc.website}\n`;
      if (vc.address) {
        const addr = vc.address;
        vcard += `ADR;TYPE=WORK:;;${addr.street || ""};${addr.city || ""};${addr.state || ""};${addr.zip || ""};${addr.country || ""}\n`;
      }
      if (vc.note) vcard += `NOTE:${vc.note}\n`;
      vcard += "END:VCARD";
      return vcard;

    case "social":
      return qrDoc.social_data?.url || "";

    case "event":
      const evt = qrDoc.event_data!;
      let ical = "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n";
      ical += `SUMMARY:${evt.title}\n`;
      if (evt.description) ical += `DESCRIPTION:${evt.description}\n`;
      if (evt.location) ical += `LOCATION:${evt.location}\n`;
      ical += `DTSTART:${evt.start_date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z\n`;
      if (evt.end_date)
        ical += `DTEND:${evt.end_date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z\n`;
      if (evt.organizer) ical += `ORGANIZER:${evt.organizer}\n`;
      if (evt.url) ical += `URL:${evt.url}\n`;
      ical += "END:VEVENT\nEND:VCALENDAR";
      return ical;

    case "presentation":
      return qrDoc.qr_code_url;

    default:
      return qrDoc.qr_code_url;
  }
};

export const createUnifiedQR = async (
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

    const { qr_type, title, description, qr_design, styling, access_settings } =
      req.body;

    if (!qr_type || !title) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: "QR type and title are required",
      };
      return next(error);
    }

    const existingQR = await UnifiedQR.findOne({
      user_id: userId,
      title: title.trim(),
      qr_type,
    });

    if (existingQR) {
      const error: ErrorResponse = {
        statusCode: 409,
        status: "fail",
        message: `A ${qr_type} QR with this title already exists`,
      };
      return next(error);
    }

    const typeDataMap: Record<string, string> = {
      url: "url_data",
      wifi: "wifi_data",
      vcard: "vcard_data",
      social: "social_data",
      event: "event_data",
      presentation: "presentation_data",
    };

    const requiredField = typeDataMap[qr_type];
    if (!requiredField || !req.body[requiredField]) {
      const error: ErrorResponse = {
        statusCode: 400,
        status: "fail",
        message: `${requiredField} is required for QR type: ${qr_type}`,
      };
      return next(error);
    }

    const shortCode = QRService.generateShortCode(title);

    const baseUrl = process.env.FRONTEND_URL;
    const qrCodeUrl = `${baseUrl}/qrcode/${qr_type}?id=${shortCode}&from=qr`;
    const shortUrl = `${baseUrl}/qrcode/${shortCode}`;

    const tempQR: any = {
      qr_type,
      ...req.body,
      qr_code_url: qrCodeUrl,
    };

    const qrDataString = generateQRDataString(tempQR);
    const qrCodeImage = await QRService.generateStyledQRCode(
      qrDataString,
      qr_design,
    );

    let hashedPassword: string | undefined;
    if (access_settings?.requires_password && access_settings?.password) {
      hashedPassword = await bcrypt.hash(access_settings.password, 10);
    }

    const qrData: any = {
      user_id: userId,
      qr_type,
      title: title.trim(),
      description,
      shortCode,
      qr_code_url: qrCodeUrl,
      qr_code_image: qrCodeImage,
      short_url: shortUrl,
      qr_design: qr_design || {},
      styling: styling || {},
      access_settings: {
        ...access_settings,
        password: hashedPassword,
        current_scans: 0,
      },
      // Initialise empty deduplication map
      daily_scan_fingerprints: {},
    };

    qrData[requiredField] = req.body[requiredField];

    const unifiedQR = new UnifiedQR(qrData);
    await unifiedQR.save();

    await createActivityLog({
      user_id: userId,
      activity_type: "qr_code_created",
      title: `${qr_type.toUpperCase()} QR Created`,
      description: `Created ${qr_type} QR: ${title}`,
      entity_type: "qr_code",
      entity_id: unifiedQR._id,
      entity_name: title,
      status: "success",
      metadata: { qr_type, shortCode },
      req,
    });

    const response = unifiedQR.toObject();
    if (response.access_settings?.password) {
      delete response.access_settings.password;
    }
    // Never expose fingerprint data to clients
    delete (response as any).daily_scan_fingerprints;

    res.status(201).json({
      status: "success",
      message: `${qr_type.toUpperCase()} QR code created successfully`,
      data: { qr: response, shortCode, qrCodeUrl, shortUrl },
    });
  } catch (error) {
    console.error("❌ Error creating QR:", error);

    const userId = req.user?._id || req.user?.id;
    if (userId) {
      await createActivityLog({
        user_id: userId,
        activity_type: "qr_code_created",
        title: "QR Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "failed",
        req,
      });
    }

    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error creating QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

/**
 * Get all QR codes for user
 */
export const getUserQRCodes = async (
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

    const filter: any = { user_id: userId };

    if (req.query.qr_type) filter.qr_type = req.query.qr_type;
    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === "true";
    }

    const qrCodes = await UnifiedQR.find(filter)
      // Exclude both password and fingerprint data from list responses
      .select("-access_settings.password -daily_scan_fingerprints")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UnifiedQR.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: qrCodes.length,
      data: {
        qrCodes,
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
      message: "Error fetching QR codes",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};

export const getQRById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    let qr: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      qr = await UnifiedQR.findById(id);
    }

    if (!qr) {
      qr = await UnifiedQR.findOne({ shortCode: id });
    }

    if (!qr) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "QR code not found",
      };
      return next(error);
    }

    if (!qr.is_active) {
      return next({
        statusCode: 403,
        status: "fail",
        message: "This QR code is no longer active",
      } as ErrorResponse);
    }

    if (
      qr.access_settings.expiry_date &&
      new Date() > qr.access_settings.expiry_date
    ) {
      return next({
        statusCode: 403,
        status: "fail",
        message: "This QR code has expired",
      } as ErrorResponse);
    }

    if (
      qr.access_settings.max_scans &&
      qr.access_settings.current_scans >= qr.access_settings.max_scans
    ) {
      return next({
        statusCode: 403,
        status: "fail",
        message: "This QR code has reached its scan limit",
      } as ErrorResponse);
    }

    if (qr.access_settings.requires_password) {
      if (!password) {
        return next({
          statusCode: 401,
          status: "fail",
          message: "Password required",
        } as ErrorResponse);
      }

      const qrWithPassword = await UnifiedQR.findById(qr._id).select(
        "+access_settings.password",
      );

      if (!qrWithPassword?.access_settings.password) {
        return next({
          statusCode: 500,
          status: "error",
          message: "Password configuration error",
        } as ErrorResponse);
      }

      const isValid = await bcrypt.compare(
        password,
        qrWithPassword.access_settings.password,
      );

      if (!isValid) {
        return next({
          statusCode: 401,
          status: "fail",
          message: "Incorrect password",
        } as ErrorResponse);
      }
    }

    const { isUnique } = checkAndRecordScan(qr, req);

    qr.scan_count += 1;
    qr.last_scanned_at = new Date();

    if (isUnique) {
      qr.access_settings.current_scans += 1;
      console.log(
        `✅ Unique scan recorded for QR ${qr._id} | total: ${qr.scan_count} | unique: ${qr.access_settings.current_scans}`,
      );
    } else {
      console.log(
        `ℹ️ Duplicate scan ignored for QR ${qr._id} | total hits: ${qr.scan_count}`,
      );
    }

    // Mark the nested map as modified so Mongoose detects the change
    qr.markModified("daily_scan_fingerprints");
    qr.markModified("access_settings");
    await qr.save();

    // ── Activity log (only for unique scans to avoid log spam) ──────────────
    if (isUnique) {
      await createActivityLog({
        user_id: qr.user_id,
        activity_type: "qr_scanned",
        title: "QR Code Scanned",
        description: `${qr.qr_type.toUpperCase()} QR "${qr.title}" was scanned`,
        entity_type: "qr_code",
        entity_id: qr._id,
        entity_name: qr.title,
        status: "info",
        metadata: {
          scan_count: qr.scan_count,
          unique_scan_count: qr.access_settings.current_scans,
          qr_type: qr.qr_type,
          client_ip: getClientIP(req),
        },
        req,
      });
    }

    // ── Build response (strip sensitive fields) ───────────────────────────────
    const response = qr.toObject();
    if (response.access_settings?.password) {
      delete response.access_settings.password;
    }
    delete response.daily_scan_fingerprints;

    res.status(200).json({
      status: "success",
      data: { qr: response },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return next({
        statusCode: 400,
        status: "fail",
        message: "Invalid QR ID format",
      } as ErrorResponse);
    }

    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    } as ErrorResponse);
  }
};

/**
 * Update QR
 */
export const updateQR = async (
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

    const qr = await UnifiedQR.findOne({ _id: id, user_id: userId });

    if (!qr) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "QR code not found or unauthorized",
      };
      return next(error);
    }

    const oldTitle = qr.title;
    let qrNeedsRegeneration = false;

    const allowedUpdates = [
      "title",
      "description",
      "styling",
      "is_active",
      "tags",
      "category",
      "meta_title",
      "meta_description",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (qr as any)[field] = req.body[field];
      }
    });

    const typeDataField = `${qr.qr_type}_data`;
    if (req.body[typeDataField]) {
      (qr as any)[typeDataField] = {
        ...(qr as any)[typeDataField],
        ...req.body[typeDataField],
      };
      qrNeedsRegeneration = true;
    }

    if (req.body.qr_design) {
      qr.qr_design = { ...qr.qr_design, ...req.body.qr_design };
      qrNeedsRegeneration = true;
    }

    if (req.body.access_settings) {
      const accessSettings = req.body.access_settings;
      if (accessSettings.requires_password && accessSettings.password) {
        accessSettings.password = await bcrypt.hash(
          accessSettings.password,
          10,
        );
      }
      qr.access_settings = { ...qr.access_settings, ...accessSettings };
    }

    if (qrNeedsRegeneration) {
      const qrDataString = generateQRDataString(qr);
      const qrCodeImage = await QRService.generateStyledQRCode(
        qrDataString,
        qr.qr_design,
      );
      qr.qr_code_image = qrCodeImage;
    }

    qr.markModified("qr_design");
    qr.markModified("styling");
    qr.markModified("access_settings");
    qr.markModified(typeDataField);

    await qr.save();

    await createActivityLog({
      user_id: userId,
      activity_type: "qr_code_updated",
      title: "QR Code Updated",
      description: `Updated ${qr.qr_type} QR: ${qr.title}`,
      entity_type: "qr_code",
      entity_id: qr._id,
      entity_name: qr.title,
      status: "success",
      metadata: {
        old_title: oldTitle,
        new_title: qr.title,
        qr_regenerated: qrNeedsRegeneration,
      },
      req,
    });

    const response = qr.toObject();
    if (response.access_settings?.password) {
      delete response.access_settings.password;
    }
    delete (response as any).daily_scan_fingerprints;

    res.status(200).json({
      status: "success",
      message: "QR code updated successfully",
      data: { qr: response, qr_regenerated: qrNeedsRegeneration },
    });
  } catch (error) {
    console.error("❌ Error updating QR:", error);
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    } as ErrorResponse);
  }
};

/**
 * Delete QR
 */
export const deleteQR = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next({
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      } as ErrorResponse);
    }

    const qr = await UnifiedQR.findOneAndDelete({ _id: id, user_id: userId });

    if (!qr) {
      return next({
        statusCode: 404,
        status: "fail",
        message: "QR code not found or unauthorized",
      } as ErrorResponse);
    }

    await createActivityLog({
      user_id: userId,
      activity_type: "qr_code_deleted",
      title: "QR Code Deleted",
      description: `Deleted ${qr.qr_type} QR: ${qr.title}`,
      entity_type: "qr_code",
      entity_id: id,
      entity_name: qr.title,
      status: "success",
      req,
    });

    res.status(200).json({
      status: "success",
      message: "QR code deleted successfully",
    });
  } catch (error) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error deleting QR code",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    } as ErrorResponse);
  }
};

export const getQRAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next({
        statusCode: 401,
        status: "fail",
        message: "User not authenticated",
      } as ErrorResponse);
    }

    const qr = await UnifiedQR.findOne({ _id: id, user_id: userId }).select(
      "-daily_scan_fingerprints",
    );

    if (!qr) {
      return next({
        statusCode: 404,
        status: "fail",
        message: "QR code not found",
      } as ErrorResponse);
    }

    res.status(200).json({
      status: "success",
      data: {
        analytics: {
          qr_type: qr.qr_type,
          // Total raw hits (every request, including duplicates)
          total_hits: qr.scan_count,
          // Unique device/IP per day — the meaningful engagement metric
          unique_scans: qr.access_settings.current_scans,
          last_scanned_at: qr.last_scanned_at,
          max_scans: qr.access_settings.max_scans,
          expiry_date: qr.access_settings.expiry_date,
          is_active: qr.is_active,
          created_at: qr.createdAt,
        },
      },
    });
  } catch (error) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching analytics",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    } as ErrorResponse);
  }
};
