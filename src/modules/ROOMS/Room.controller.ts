import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import fs from "fs/promises";
import { Room, IRoom } from "./Room.model";
import { RoomBooking } from "./Booking.model";
import { ErrorResponse } from "../../utilities/errorHandler.util";
import { ActivityLogger } from "../Activitylog/Activitylogger.service";
import { notificationService } from "../Notifications/notificationService";

function parseFormFields(body: Record<string, unknown>) {
  const JSON_FIELDS = [
    "amenities",
    "fullAmenities",
    "extraServices",
    "includes",
    "tags",
    "images",
    "pricingTiers",
  ];
  const NUM_FIELDS = [
    "floor",
    "maxGuests",
    "maxAdults",
    "maxChildren",
    "minNights",
    "maxNights",
    "sizeValue",
    "bedCount",
    "bathrooms",
    "pricePerNight",
    "depositAmount",
    "depositPercent",
    "holdHours",
    "cleaningFee",
    "taxRate",
    "serviceChargeRate",
    "sortOrder",
    "rating",
    "reviewCount",
  ];
  const BOOL_FIELDS = [
    "smokingAllowed",
    "petFriendly",
    "accessible",
    "isAvailable",
    "isPublished",
  ];

  const parsed: Record<string, unknown> = { ...body };

  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field] as string);
      } catch {
        parsed[field] = [];
      }
    }
  }

  for (const field of NUM_FIELDS) {
    if (parsed[field] !== undefined && parsed[field] !== "") {
      parsed[field] = Number(parsed[field]);
    }
  }

  for (const field of BOOL_FIELDS) {
    if (typeof parsed[field] === "string") {
      parsed[field] = parsed[field] === "true";
    }
  }

  // Sanitize thumbnailImage — reject objects/Files, keep only strings
  if (typeof parsed.thumbnailImage !== "string") {
    delete parsed.thumbnailImage;
  }

  // Don't wipe existing images with an empty array
  if (
    Array.isArray(parsed.images) &&
    (parsed.images as unknown[]).length === 0
  ) {
    delete parsed.images;
    delete parsed.thumbnailImage;
  }

  return parsed;
}

// ── Cloudinary Configuration ──────────────────────────────────────────────────
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cloudinary Helpers ────────────────────────────────────────────────────────

/**
 * Upload a single express-fileupload file to Cloudinary.
 * Returns the secure_url string.
 */
const uploadToCloudinary = async (
  file: any,
  folder = "Durbanhotel/rooms",
): Promise<string> => {
  try {
    if (!file?.tempFilePath) {
      throw new Error("No temp file path found");
    }

    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      folder,
      resource_type: "auto",
      transformation: [
        { width: 1200, height: 800, crop: "limit" },
        { quality: "auto" },
        { format: "jpg" },
      ],
    });

    // Clean up temp file after upload
    await fs.unlink(file.tempFilePath).catch(() => {});
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
};

/**
 * Upload multiple express-fileupload files concurrently.
 * Accepts a single file object or an array of file objects.
 * Returns an array of secure_url strings.
 */
const uploadManyToCloudinary = async (
  files: any,
  folder = "hotel/rooms",
): Promise<string[]> => {
  const fileArray = Array.isArray(files) ? files : [files];
  return Promise.all(fileArray.map((f) => uploadToCloudinary(f, folder)));
};

/**
 * Delete a Cloudinary image by its URL.
 * Silently no-ops if the URL is empty or not a valid Cloudinary URL.
 */
const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    if (!url) return;

    const urlParts = url.split("/");
    const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

    if (versionIndex === -1) {
      console.warn(`Skipping delete — invalid Cloudinary URL: ${url}`);
      return;
    }

    const publicId = urlParts
      .slice(versionIndex + 1)
      .join("/")
      .replace(/\.[^/.]+$/, "");

    const result = await cloudinary.v2.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`Deleted from Cloudinary: ${publicId}`);
    } else {
      console.warn(`Cloudinary delete failed for: ${publicId}`, result);
    }
  } catch (error) {
    console.error("deleteFromCloudinary error:", error);
  }
};

/**
 * Delete multiple Cloudinary images concurrently.
 */
const deleteManyFromCloudinary = async (urls: string[]): Promise<void> => {
  if (!urls?.length) return;
  await Promise.allSettled(urls.map(deleteFromCloudinary));
};

// ── Booking / Pricing Helpers ─────────────────────────────────────────────────

function generateBookingRef(): string {
  return `BK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function calcPricing(
  room: IRoom,
  nights: number,
  roomCount: number,
  extras: Array<{ label: string; price: number }> = [],
) {
  const subtotal = parseFloat(
    (room.pricePerNight * nights * roomCount).toFixed(2),
  );
  const cleaningFee = parseFloat((room.cleaningFee * roomCount).toFixed(2));
  const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);
  const tax = parseFloat(((subtotal + cleaningFee) * room.taxRate).toFixed(2));
  const serviceCharge = parseFloat(
    ((subtotal + cleaningFee) * room.serviceChargeRate).toFixed(2),
  );
  const depositAmount =
    room.depositAmount > 0
      ? room.depositAmount
      : parseFloat(((subtotal * room.depositPercent) / 100).toFixed(2));
  const grandTotal = parseFloat(
    (subtotal + cleaningFee + tax + serviceCharge + extrasTotal).toFixed(2),
  );

  return {
    subtotal,
    cleaningFee,
    tax,
    serviceCharge,
    depositAmount,
    grandTotal,
    extrasTotal,
  };
}

// ── CHECK ROOM CONFLICT ───────────────────────────────────────────────────────
async function hasBookingConflict(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const query: Record<string, unknown> = {
    room: roomId,
    status: { $nin: ["cancelled", "checked-out", "no-show"] },
    $or: [
      { checkIn: { $lt: checkOut, $gte: checkIn } },
      { checkOut: { $gt: checkIn, $lte: checkOut } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } },
    ],
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const existing = await RoomBooking.findOne(query);
  return !!existing;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOM CRUD
// ══════════════════════════════════════════════════════════════════════════════

// ── GET ALL ROOMS (public) ────────────────────────────────────────────────────
export const getRooms = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      category,
      status,
      bedType,
      view,
      minPrice,
      maxPrice,
      minGuests,
      maxGuests,
      minSize,
      maxSize,
      petFriendly,
      smokingAllowed,
      accessible,
      isAvailable,
      isPublished,
      tags,
      search,
      sortBy = "sortOrder",
      sortOrder = "asc",
      page = "1",
      limit = "20",
      checkIn,
      checkOut,
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};

    const isAdminRoute = req.path.includes("/admin");
    if (!isAdminRoute) {
      query.isPublished = true;
      query.isAvailable = true;
    } else {
      if (isPublished !== undefined) query.isPublished = isPublished === "true";
      if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
    }

    if (category) query.category = category;
    if (status) query.status = status;
    if (bedType) query.bedType = bedType;
    if (view) query.view = new RegExp(view, "i");
    if (petFriendly === "true") query.petFriendly = true;
    if (smokingAllowed === "true") query.smokingAllowed = true;
    if (accessible === "true") query.accessible = true;
    if (tags) query.tags = { $in: tags.split(",") };

    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice)
        (query.pricePerNight as Record<string, unknown>)["$gte"] =
          Number(minPrice);
      if (maxPrice)
        (query.pricePerNight as Record<string, unknown>)["$lte"] =
          Number(maxPrice);
    }

    if (minGuests || maxGuests) {
      query.maxGuests = {};
      if (minGuests)
        (query.maxGuests as Record<string, unknown>)["$gte"] =
          Number(minGuests);
      if (maxGuests)
        (query.maxGuests as Record<string, unknown>)["$lte"] =
          Number(maxGuests);
    }

    if (minSize || maxSize) {
      query.sizeValue = {};
      if (minSize)
        (query.sizeValue as Record<string, unknown>)["$gte"] = Number(minSize);
      if (maxSize)
        (query.sizeValue as Record<string, unknown>)["$lte"] = Number(maxSize);
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { category: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
      ];
    }

    let unavailableRoomIds: string[] = [];
    if (checkIn && checkOut) {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const conflicts = await RoomBooking.find({
        status: { $nin: ["cancelled", "checked-out", "no-show"] },
        $or: [
          { checkIn: { $lt: outDate, $gte: inDate } },
          { checkOut: { $gt: inDate, $lte: outDate } },
          { checkIn: { $lte: inDate }, checkOut: { $gte: outDate } },
        ],
      }).distinct("room");
      unavailableRoomIds = conflicts.map(String);
      if (unavailableRoomIds.length) {
        query._id = { $nin: unavailableRoomIds };
      }
    }

    const limitNum = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * limitNum;
    const sortDir = sortOrder === "desc" ? -1 : 1;
    const sortField = [
      "pricePerNight",
      "rating",
      "sortOrder",
      "createdAt",
    ].includes(sortBy)
      ? sortBy
      : "sortOrder";

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum),
      Room.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      results: rooms.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { rooms },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching rooms",
    } as ErrorResponse);
  }
};

// ── GET SINGLE ROOM (by slug) ─────────────────────────────────────────────────
export const getRoomBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { slug } = req.params;
    const room = await Room.findOne({ slug, isPublished: true });
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }
    res.status(200).json({ status: "success", data: { room } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching room",
    } as ErrorResponse);
  }
};

// ── GET SINGLE ROOM (by id) ───────────────────────────────────────────────────
export const getRoomById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }
    res.status(200).json({ status: "success", data: { room } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching room",
    } as ErrorResponse);
  }
};

// ── CREATE ROOM (admin) ───────────────────────────────────────────────────────
export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // ✅ Parse all multipart string fields into proper types first
    const body = parseFormFields(req.body as Record<string, unknown>);

    const {
      slug,
      name,
      category,
      roomNumber,
      floor,
      maxGuests,
      maxAdults,
      maxChildren,
      minNights,
      maxNights,
      size,
      sizeValue,
      view,
      bedType,
      bedCount,
      bathrooms,
      smokingAllowed,
      petFriendly,
      accessible,
      pricePerNight,
      pricingTiers,
      depositAmount,
      depositPercent,
      holdHours,
      cleaningFee,
      taxRate,
      serviceChargeRate,
      description,
      longDescription,
      thumbnailImage,
      amenities,
      fullAmenities,
      includes,
      extraServices,
      isAvailable,
      isPublished,
      tags,
      sortOrder,
    } = body;

    // ── Validation
    if (!name || !(name as string).trim()) {
      next({
        statusCode: 400,
        status: "fail",
        message: "Room name is required",
      } as ErrorResponse);
      return;
    }
    if (!slug || !(slug as string).trim()) {
      next({
        statusCode: 400,
        status: "fail",
        message: "Slug is required",
      } as ErrorResponse);
      return;
    }
    if (!pricePerNight) {
      next({
        statusCode: 400,
        status: "fail",
        message: "pricePerNight is required",
      } as ErrorResponse);
      return;
    }
    if (!bedType) {
      next({
        statusCode: 400,
        status: "fail",
        message: "bedType is required",
      } as ErrorResponse);
      return;
    }

    const existing = await Room.findOne({ slug });
    if (existing) {
      next({
        statusCode: 409,
        status: "fail",
        message: `Slug "${slug}" already exists`,
      } as ErrorResponse);
      return;
    }

    // ✅ FIX: read from "newImages" (files) and "existingImages" (JSON string of URLs)
    let uploadedImageUrls: string[] = [];
    if (req.files && (req.files as any).newImages) {
      const rawFiles = (req.files as any).newImages;
      uploadedImageUrls = await uploadManyToCloudinary(
        Array.isArray(rawFiles) ? rawFiles : [rawFiles],
        "hotel/rooms",
      );
    }

    // Parse existing URLs sent as JSON string under "existingImages"
    let existingUrls: string[] = [];
    if (typeof req.body.existingImages === "string") {
      try {
        existingUrls = JSON.parse(req.body.existingImages);
      } catch {
        existingUrls = [];
      }
    } else if (Array.isArray(req.body.existingImages)) {
      existingUrls = req.body.existingImages.filter(
        (u: any) => typeof u === "string" && u.trim(),
      );
    }

    const allImages = [...existingUrls, ...uploadedImageUrls];
    const finalThumbnail =
      typeof thumbnailImage === "string" && (thumbnailImage as string).trim()
        ? (thumbnailImage as string).trim()
        : (allImages[0] ?? "");

    const room = await Room.create({
      slug,
      name,
      category,
      roomNumber,
      floor: Number(floor) || 1,
      maxGuests:
        Number(maxGuests) ||
        (Number(maxAdults) || 2) + (Number(maxChildren) || 0),
      maxAdults: Number(maxAdults) || 2,
      maxChildren: Number(maxChildren) || 0,
      minNights: Number(minNights) || 1,
      maxNights: Number(maxNights) || 0,
      size,
      sizeValue: Number(sizeValue) || 0,
      view,
      bedType,
      bedCount: Number(bedCount) || 1,
      bathrooms: Number(bathrooms) || 1,
      smokingAllowed: smokingAllowed === true || smokingAllowed === "true",
      petFriendly: petFriendly === true || petFriendly === "true",
      accessible: accessible === true || accessible === "true",
      pricePerNight: Number(pricePerNight),
      pricingTiers: Array.isArray(pricingTiers) ? pricingTiers : [],
      depositAmount: Number(depositAmount) || 0,
      depositPercent: Number(depositPercent) || 0,
      holdHours: Number(holdHours) || 4,
      cleaningFee: Number(cleaningFee) || 0,
      taxRate: Number(taxRate) || 0.075,
      serviceChargeRate: Number(serviceChargeRate) || 0.05,
      description,
      longDescription,
      images: allImages,
      thumbnailImage: finalThumbnail,
      amenities: Array.isArray(amenities) ? amenities : [],
      fullAmenities: Array.isArray(fullAmenities) ? fullAmenities : [],
      includes: Array.isArray(includes) ? includes : [],
      extraServices: Array.isArray(extraServices) ? extraServices : [],
      isAvailable:
        isAvailable !== undefined
          ? isAvailable === true || isAvailable === "true"
          : true,
      isPublished: isPublished === true || isPublished === "true",
      tags: Array.isArray(tags) ? tags : [],
      sortOrder: Number(sortOrder) || 0,
    });

    res
      .status(201)
      .json({ status: "success", message: "Room created", data: { room } });
  } catch (err) {
    console.error("createRoom error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: err instanceof Error ? err.message : "Error creating room",
    } as ErrorResponse);
  }
};

// ── UPDATE ROOM (admin) ───────────────────────────────────────────────────────
export const updateRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }

    const body = parseFormFields(req.body as Record<string, unknown>);

    // ── Slug uniqueness check
    if (body.slug && body.slug !== room.slug) {
      const conflict = await Room.findOne({ slug: body.slug });
      if (conflict) {
        next({
          statusCode: 409,
          status: "fail",
          message: `Slug "${body.slug}" already in use`,
        } as ErrorResponse);
        return;
      }
    }

    // ── Auto-sync maxGuests
    if (body.maxAdults !== undefined || body.maxChildren !== undefined) {
      body.maxGuests =
        ((body.maxAdults as number) ?? room.maxAdults) +
        ((body.maxChildren as number) ?? room.maxChildren);
    }

    let newlyUploadedUrls: string[] = [];
    if (req.files && (req.files as any).newImages) {
      const rawFiles = (req.files as any).newImages;
      newlyUploadedUrls = await uploadManyToCloudinary(
        Array.isArray(rawFiles) ? rawFiles : [rawFiles],
        "hotel/rooms",
      );
    }

    let existingUrls: string[] = [];
    if (typeof req.body.existingImages === "string") {
      try {
        existingUrls = JSON.parse(req.body.existingImages);
      } catch {
        existingUrls = [];
      }
    } else if (Array.isArray(req.body.existingImages)) {
      existingUrls = req.body.existingImages.filter(
        (u: any) => typeof u === "string" && u.trim(),
      );
    }

    // ── Build final images array
    let finalImages: string[];
    const userManagedImages =
      existingUrls.length > 0 || newlyUploadedUrls.length > 0;

    if (userManagedImages) {
      finalImages = [...existingUrls, ...newlyUploadedUrls];
    } else if (req.body.existingImages !== undefined) {
      // User explicitly sent an empty list — clear images
      finalImages = [];
    } else {
      // Field not sent at all — preserve existing
      finalImages = room.images ?? [];
    }

    // ── Detect & delete removed images from Cloudinary
    if (req.body.existingImages !== undefined) {
      const removedUrls = (room.images ?? []).filter(
        (oldUrl) => !finalImages.includes(oldUrl),
      );
      if (removedUrls.length) {
        await deleteManyFromCloudinary(removedUrls);
      }
    }

    const {
      images: _i,
      thumbnailImage: _t,
      existingImages: _e,
      ...restBody
    } = body as any;
    Object.assign(room, restBody);

    // ── Set images and thumbnail
    room.images = finalImages;
    if (
      typeof req.body.thumbnailImage === "string" &&
      req.body.thumbnailImage.trim()
    ) {
      room.thumbnailImage = req.body.thumbnailImage.trim();
    } else if (
      finalImages.length > 0 &&
      !finalImages.includes(room.thumbnailImage)
    ) {
      room.thumbnailImage = finalImages[0];
    } else if (!room.thumbnailImage && finalImages.length > 0) {
      room.thumbnailImage = finalImages[0];
    }

    await room.save();

    res
      .status(200)
      .json({ status: "success", message: "Room updated", data: { room } });
  } catch (err) {
    console.error("updateRoom error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: err instanceof Error ? err.message : "Error updating room",
    } as ErrorResponse);
  }
};

// ── DELETE ROOM (admin) ───────────────────────────────────────────────────────
export const deleteRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }

    // ── Block delete if active bookings exist
    const activeBookings = await RoomBooking.countDocuments({
      room: room._id,
      status: { $in: ["pending", "confirmed", "checked-in"] },
    });
    if (activeBookings > 0) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Cannot delete: ${activeBookings} active booking(s) exist for this room`,
      } as ErrorResponse);
      return;
    }

    // ── Delete all Cloudinary images before removing the DB record ────────────
    const imagesToDelete = [
      ...(room.images ?? []),
      // Include thumbnail only if it's not already in the images array
      ...(room.thumbnailImage && !room.images?.includes(room.thumbnailImage)
        ? [room.thumbnailImage]
        : []),
    ].filter(Boolean);

    if (imagesToDelete.length) {
      await deleteManyFromCloudinary(imagesToDelete);
    }

    await room.deleteOne();
    res.status(200).json({ status: "success", message: "Room deleted" });
  } catch (err) {
    console.error("deleteRoom error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: err instanceof Error ? err.message : "Error deleting room",
    } as ErrorResponse);
  }
};

// ── TOGGLE PUBLISH (admin) ────────────────────────────────────────────────────
export const togglePublish = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }
    room.isPublished = !room.isPublished;
    await room.save();
    res.status(200).json({
      status: "success",
      message: `Room ${room.isPublished ? "published" : "unpublished"}`,
      data: { room },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error toggling publish status",
    } as ErrorResponse);
  }
};

// ── UPDATE STATUS (admin) ─────────────────────────────────────────────────────
export const updateRoomStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body;
    const VALID = ["available", "occupied", "maintenance", "reserved"];
    if (!VALID.includes(status)) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Invalid status. Allowed: ${VALID.join(", ")}`,
      } as ErrorResponse);
      return;
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { status, isAvailable: status === "available" },
      { new: true },
    );
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }
    res.status(200).json({
      status: "success",
      message: `Room status set to "${status}"`,
      data: { room },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating room status",
    } as ErrorResponse);
  }
};

// ── CHECK AVAILABILITY (public) ───────────────────────────────────────────────
export const checkAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut, adults, children } = req.body;

    if (!roomId || !checkIn || !checkOut) {
      next({
        statusCode: 400,
        status: "fail",
        message: "roomId, checkIn, checkOut are required",
      } as ErrorResponse);
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (outDate <= inDate) {
      next({
        statusCode: 400,
        status: "fail",
        message: "checkOut must be after checkIn",
      } as ErrorResponse);
      return;
    }

    const room = await Room.findOne({ _id: roomId, isPublished: true });
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }

    const totalGuests = (Number(adults) || 1) + (Number(children) || 0);
    if (totalGuests > room.maxGuests) {
      res.status(200).json({
        status: "success",
        available: false,
        reason: `This room holds max ${room.maxGuests} guests. You requested ${totalGuests}.`,
      });
      return;
    }

    const hasConflict = await hasBookingConflict(roomId, inDate, outDate);
    const nights = Math.max(
      1,
      Math.ceil((outDate.getTime() - inDate.getTime()) / 86400000),
    );
    const pricing = hasConflict ? null : calcPricing(room, nights, 1);

    res.status(200).json({
      status: "success",
      available: !hasConflict,
      reason: hasConflict
        ? "Room is not available for the selected dates"
        : null,
      nights,
      pricing,
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error checking availability",
    } as ErrorResponse);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  ROOM BOOKING CRUD
// ══════════════════════════════════════════════════════════════════════════════

// ── CREATE BOOKING (public) ───────────────────────────────────────────────────
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      roomCount,
      guestName,
      guestPhone,
      guestEmail,
      specialRequests,
      paymentMethod,
      selectedExtras,
      source,
    } = req.body;
    const authReq = req as any;

    if (!roomId) {
      next({
        statusCode: 400,
        status: "fail",
        message: "roomId is required",
      } as ErrorResponse);
      return;
    }
    if (!checkIn) {
      next({
        statusCode: 400,
        status: "fail",
        message: "checkIn is required",
      } as ErrorResponse);
      return;
    }
    if (!checkOut) {
      next({
        statusCode: 400,
        status: "fail",
        message: "checkOut is required",
      } as ErrorResponse);
      return;
    }
    if (!guestName?.trim()) {
      next({
        statusCode: 400,
        status: "fail",
        message: "Guest name is required",
      } as ErrorResponse);
      return;
    }
    if (!guestPhone?.trim()) {
      next({
        statusCode: 400,
        status: "fail",
        message: "Guest phone is required",
      } as ErrorResponse);
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (outDate <= inDate) {
      next({
        statusCode: 400,
        status: "fail",
        message: "checkOut must be after checkIn",
      } as ErrorResponse);
      return;
    }

    const room = await Room.findOne({
      _id: roomId,
      isPublished: true,
      isAvailable: true,
    });
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found or not available",
      } as ErrorResponse);
      return;
    }

    const adultCount = Math.max(1, Number(adults) || 1);
    const childrenCount = Math.max(0, Number(children) || 0);
    const totalGuests = adultCount + childrenCount;

    if (totalGuests > room.maxGuests) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Room max capacity is ${room.maxGuests} guests`,
      } as ErrorResponse);
      return;
    }

    const nights = Math.max(
      1,
      Math.ceil((outDate.getTime() - inDate.getTime()) / 86400000),
    );
    if (nights < room.minNights) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Minimum stay is ${room.minNights} night(s)`,
      } as ErrorResponse);
      return;
    }
    if (room.maxNights > 0 && nights > room.maxNights) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Maximum stay is ${room.maxNights} night(s)`,
      } as ErrorResponse);
      return;
    }

    const count = Math.max(1, Number(roomCount) || 1);
    const hasConflict = await hasBookingConflict(roomId, inDate, outDate);
    if (hasConflict) {
      next({
        statusCode: 409,
        status: "fail",
        message: "Room is not available for the selected dates",
      } as ErrorResponse);
      return;
    }

    const extras = Array.isArray(selectedExtras) ? selectedExtras : [];
    const pricing = calcPricing(room, nights, count, extras);

    const booking = await RoomBooking.create({
      room: room._id,
      roomSnapshot: {
        name: room.name,
        slug: room.slug,
        roomNumber: room.roomNumber,
        category: room.category,
        pricePerNight: room.pricePerNight,
        bedType: room.bedType,
        maxGuests: room.maxGuests,
      },
      checkIn: inDate,
      checkOut: outDate,
      nights,
      adults: adultCount,
      children: childrenCount,
      totalGuests,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail?.trim() || "",
      specialRequests: specialRequests || "",
      roomCount: count,
      pricePerNight: room.pricePerNight,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      tax: pricing.tax,
      serviceCharge: pricing.serviceCharge,
      depositAmount: pricing.depositAmount,
      total: pricing.subtotal + pricing.cleaningFee,
      grandTotal: pricing.grandTotal,
      selectedExtras: extras,
      paymentMethod: paymentMethod || "cash",
      source: source || "website",
      bookingRef: generateBookingRef(),
      status: "pending",
      paymentStatus: "unpaid",
      ...(req.user?._id ? { createdBy: req.user._id } : {}),
    });
    await ActivityLogger.bookingCreated(
      booking.bookingRef,
      booking._id.toString(),
      booking.guestName,
    );
    await notificationService.newBooking(booking);

    res.status(201).json({
      status: "success",
      message: "Booking created successfully",
      data: { booking },
    });
  } catch (err) {
    console.error("createBooking error:", err);
    next({
      statusCode: 500,
      status: "error",
      message: err instanceof Error ? err.message : "Error creating booking",
    } as ErrorResponse);
  }
};

// ── GET ALL BOOKINGS (admin/staff) ────────────────────────────────────────────
export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      status,
      paymentStatus,
      roomId,
      checkIn,
      checkOut,
      guestPhone,
      guestEmail,
      source,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (roomId) query.room = roomId;
    if (guestPhone) query.guestPhone = guestPhone;
    if (guestEmail) query.guestEmail = guestEmail;
    if (source) query.source = source;
    if (checkIn) query.checkIn = { $gte: new Date(checkIn) };
    if (checkOut) query.checkOut = { $lte: new Date(checkOut) };

    const limitNum = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      RoomBooking.find(query)
        .populate("room", "name slug roomNumber category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      RoomBooking.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      results: bookings.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      data: { bookings },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching bookings",
    } as ErrorResponse);
  }
};

// ── GET SINGLE BOOKING ────────────────────────────────────────────────────────
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const booking = await RoomBooking.findById(req.params.id).populate(
      "room",
      "name slug roomNumber",
    );
    if (!booking) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Booking not found",
      } as ErrorResponse);
      return;
    }
    res.status(200).json({ status: "success", data: { booking } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching booking",
    } as ErrorResponse);
  }
};

// ── GET BOOKING BY REF (public) ───────────────────────────────────────────────
export const getBookingByRef = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const booking = await RoomBooking.findOne({
      bookingRef: req.params.ref,
    }).populate("room", "name slug roomNumber thumbnailImage");
    if (!booking) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Booking not found",
      } as ErrorResponse);
      return;
    }
    res.status(200).json({ status: "success", data: { booking } });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching booking",
    } as ErrorResponse);
  }
};

// ── UPDATE BOOKING STATUS (admin/staff) ───────────────────────────────────────
export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, cancelReason } = req.body;
    const VALID = [
      "pending",
      "confirmed",
      "checked-in",
      "checked-out",
      "cancelled",
      "no-show",
    ];
    if (!VALID.includes(status)) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Invalid status. Allowed: ${VALID.join(", ")}`,
      } as ErrorResponse);
      return;
    }

    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Booking not found",
      } as ErrorResponse);
      return;
    }

    booking.status = status;
    if (status === "confirmed") booking.confirmedAt = new Date();
    if (status === "checked-in") booking.checkedInAt = new Date();
    if (status === "checked-out") booking.checkedOutAt = new Date();
    if (status === "cancelled") {
      booking.cancelledAt = new Date();
      booking.cancelReason = cancelReason || "";
    }

    if (status === "checked-in") {
      await Room.findByIdAndUpdate(booking.room, {
        status: "occupied",
        isAvailable: false,
      });
    }
    if (["checked-out", "cancelled", "no-show"].includes(status)) {
      await Room.findByIdAndUpdate(booking.room, {
        status: "available",
        isAvailable: true,
      });
    }

    await booking.save();
    await ActivityLogger.bookingStatusUpdated(
      req,
      booking.bookingRef,
      booking._id.toString(),
      status,
    );
    // Map status → specific notification
    const notifyMap: Record<string, () => Promise<void>> = {
      confirmed: () => notificationService.bookingConfirmed(booking),
      "checked-in": () => notificationService.guestCheckedIn(booking),
      "checked-out": () => notificationService.guestCheckedOut(booking),
      cancelled: () =>
        notificationService.bookingCancelled(booking, cancelReason),
    };
    if (notifyMap[status]) await notifyMap[status]();
    res.status(200).json({
      status: "success",
      message: `Booking status updated to "${status}"`,
      data: { booking },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating booking status",
    } as ErrorResponse);
  }
};

// ── UPDATE PAYMENT STATUS (admin/staff) ───────────────────────────────────────
export const updateBookingPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentStatus, paymentMethod, paymentNotes } = req.body;
    const VALID = [
      "unpaid",
      "deposit_paid",
      "paid",
      "refunded",
      "partially-refunded",
    ];
    if (!VALID.includes(paymentStatus)) {
      next({
        statusCode: 400,
        status: "fail",
        message: `Invalid payment status. Allowed: ${VALID.join(", ")}`,
      } as ErrorResponse);
      return;
    }

    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Booking not found",
      } as ErrorResponse);
      return;
    }

    const prev = booking.paymentStatus;
    booking.paymentStatus = paymentStatus;
    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (paymentNotes) booking.paymentNotes = paymentNotes;
    await booking.save();

    await ActivityLogger.bookingPaymentUpdated(
      req,
      booking.bookingRef,
      booking._id.toString(),
      paymentStatus,
    );
    await notificationService.bookingPaymentUpdated(booking, prev);
    res.status(200).json({
      status: "success",
      message: `Payment status updated to "${paymentStatus}"`,
      data: { booking },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error updating payment",
    } as ErrorResponse);
  }
};

// ── GET BOOKINGS BY GUEST PHONE (public) ──────────────────────────────────────
export const getBookingsByPhone = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { phone } = req.params;
    if (!phone) {
      next({
        statusCode: 400,
        status: "fail",
        message: "Phone number required",
      } as ErrorResponse);
      return;
    }

    const bookings = await RoomBooking.find({ guestPhone: phone })
      .populate("room", "name slug roomNumber thumbnailImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error fetching bookings",
    } as ErrorResponse);
  }
};

// ── PRICE ESTIMATE (public) ───────────────────────────────────────────────────
export const getPriceEstimate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut, roomCount, extras } = req.body;
    if (!roomId || !checkIn || !checkOut) {
      next({
        statusCode: 400,
        status: "fail",
        message: "roomId, checkIn, checkOut are required",
      } as ErrorResponse);
      return;
    }

    const room = await Room.findOne({ _id: roomId, isPublished: true });
    if (!room) {
      next({
        statusCode: 404,
        status: "fail",
        message: "Room not found",
      } as ErrorResponse);
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.max(
      1,
      Math.ceil((outDate.getTime() - inDate.getTime()) / 86400000),
    );
    const count = Math.max(1, Number(roomCount) || 1);
    const pricing = calcPricing(room, nights, count, extras || []);

    res.status(200).json({
      status: "success",
      data: {
        nights,
        roomCount: count,
        pricePerNight: room.pricePerNight,
        ...pricing,
      },
    });
  } catch (err) {
    next({
      statusCode: 500,
      status: "error",
      message: "Error calculating price",
    } as ErrorResponse);
  }
};
