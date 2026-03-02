import { Router } from "express";
import {
  getRooms,
  getRoomBySlug,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  togglePublish,
  updateRoomStatus,
  checkAvailability,
  createBooking,
  getBookings,
  getBookingById,
  getBookingByRef,
  updateBookingStatus,
  updateBookingPayment,
  getBookingsByPhone,
  getPriceEstimate,
} from "../ROOMS/Room.controller";

// ── Import your existing auth middlewares ─────────────────────────────────────
import { verifyAuth } from "../../middlewares/roleVerification.middleware";
import { restrictTo } from "../../middlewares/roleVerification.middleware";

const router = Router();

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES — no auth required
//  ⚠️ IMPORTANT: Order matters - more specific routes first
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/rooms/booking/ref/:ref     — guest tracking by booking ref (most specific)
router.get("/booking/ref/:ref", getBookingByRef);

// GET /api/rooms/booking/phone/:phone — guest booking history by phone
router.get("/booking/phone/:phone", getBookingsByPhone);

// POST /api/rooms/availability  — check if room is free for dates
router.post("/availability", checkAvailability);

// POST /api/rooms/estimate      — get price breakdown before booking
router.post("/estimate", getPriceEstimate);

// POST /api/rooms/book          — create a booking
router.post("/createBooking", createBooking);

// GET /api/rooms/slug/:slug    — single room by slug
router.get("/getRoomBySlug/:slug", getRoomBySlug);

// GET /api/rooms/:id           — single room by mongo id
router.get("/getRoomById/:id", getRoomById);

// GET /api/rooms               — all published rooms (with filters) - least specific
router.get("/rooms", getRooms);

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES — protect + restrict to admin/staff
// ══════════════════════════════════════════════════════════════════════════════

// Apply authentication and authorization to all admin routes
router.use("/admin", verifyAuth);
router.use("/admin", restrictTo(["admin", "super-admin"]));

// Room CRUD
// POST   /api/rooms/admin/rooms             — create room
router.post("/admin/rooms", createRoom);
router.get("/admin/rooms", getRooms);

// PATCH  /api/rooms/admin/rooms/:id         — update room
router.patch("/admin/rooms/:id", updateRoom);

// DELETE /api/rooms/admin/rooms/:id         — delete room
router.delete("/admin/rooms/:id", deleteRoom);

// PATCH  /api/rooms/admin/rooms/:id/publish — toggle publish
router.patch("/admin/rooms/:id/publish", togglePublish);

// PATCH  /api/rooms/admin/rooms/:id/status  — set status (available/maintenance/etc)
router.patch("/admin/rooms/:id/status", updateRoomStatus);

// Booking management
// GET   /api/rooms/admin/bookings            — all bookings (filtered)
router.get("/admin/bookings", getBookings);

// GET   /api/rooms/admin/bookings/:id        — single booking
router.get("/admin/bookings/:id", getBookingById);

// PATCH /api/rooms/admin/bookings/:id/status  — update booking status
router.patch("/admin/bookings/:id/status", updateBookingStatus);

// PATCH /api/rooms/admin/bookings/:id/payment — update payment status
router.patch("/admin/bookings/:id/payment", updateBookingPayment);

export default router;
