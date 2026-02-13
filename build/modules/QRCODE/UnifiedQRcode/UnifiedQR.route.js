"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UnifiedQR_controller_1 = require("../../QRCODE/UnifiedQRcode/UnifiedQR.controller");
const asyncHandler_middleware_1 = require("../../../middlewares/asyncHandler.middleware");
const roleVerification_middleware_1 = require("../../../middlewares/roleVerification.middleware");
const unifiedQRRouter = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: UnifiedQR
 *   description: Unified API for all QR code types (URL, WiFi, vCard, Social, Event, Presentation)
 */
/**
 * @swagger
 * /api/qr:
 *   post:
 *     summary: Create a new QR code (any type)
 *     description: Create a QR code of any supported type with custom styling
 *     tags: [UnifiedQR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qr_type
 *               - title
 *             properties:
 *               qr_type:
 *                 type: string
 *                 enum: [url, wifi, vcard, social, event, presentation]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url_data:
 *                 type: object
 *                 description: Required if qr_type is 'url'
 *               wifi_data:
 *                 type: object
 *                 description: Required if qr_type is 'wifi'
 *               vcard_data:
 *                 type: object
 *                 description: Required if qr_type is 'vcard'
 *               social_data:
 *                 type: object
 *                 description: Required if qr_type is 'social'
 *               event_data:
 *                 type: object
 *                 description: Required if qr_type is 'event'
 *               presentation_data:
 *                 type: object
 *                 description: Required if qr_type is 'presentation'
 *               qr_design:
 *                 type: object
 *                 description: QR code styling options
 *               styling:
 *                 type: object
 *                 description: Viewer page styling
 *               access_settings:
 *                 type: object
 *                 description: Access control settings
 *     responses:
 *       201:
 *         description: QR code created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate title
 */
unifiedQRRouter
    .route("/")
    .post(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.createUnifiedQR));
/**
 * @swagger
 * /api/qr:
 *   get:
 *     summary: Get all QR codes for authenticated user
 *     description: Retrieve all QR codes created by the authenticated user with optional filters
 *     tags: [UnifiedQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: qr_type
 *         schema:
 *           type: string
 *           enum: [url, wifi, vcard, social, event, presentation, menu]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: QR codes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
unifiedQRRouter
    .route("/")
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.getUserQRCodes));
/**
 * @swagger
 * /api/qr/{id}:
 *   post:
 *     summary: Get QR code by ID or shortCode
 *     description: Retrieve a specific QR code (public endpoint, may require password)
 *     tags: [UnifiedQR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR code retrieved successfully
 *       401:
 *         description: Password required or incorrect
 *       403:
 *         description: QR expired or scan limit reached
 *       404:
 *         description: QR not found
 */
unifiedQRRouter.route("/:id").post((0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.getQRById));
/**
 * @swagger
 * /api/qr/{id}:
 *   put:
 *     summary: Update QR code
 *     description: Update an existing QR code (owner only)
 *     tags: [UnifiedQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: QR code updated successfully
 *       404:
 *         description: QR not found
 *       401:
 *         description: Unauthorized
 */
unifiedQRRouter
    .route("/:id")
    .put(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.updateQR));
/**
 * @swagger
 * /api/qr/{id}:
 *   delete:
 *     summary: Delete QR code
 *     description: Delete an existing QR code (owner only)
 *     tags: [UnifiedQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code deleted successfully
 *       404:
 *         description: QR not found
 *       401:
 *         description: Unauthorized
 */
unifiedQRRouter
    .route("/:id")
    .delete(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.deleteQR));
/**
 * @swagger
 * /api/qr/{id}/analytics:
 *   get:
 *     summary: Get QR code analytics
 *     description: Get analytics data for a specific QR code (owner only)
 *     tags: [UnifiedQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       404:
 *         description: QR not found
 *       401:
 *         description: Unauthorized
 */
unifiedQRRouter
    .route("/:id/analytics")
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(UnifiedQR_controller_1.getQRAnalytics));
exports.default = unifiedQRRouter;
