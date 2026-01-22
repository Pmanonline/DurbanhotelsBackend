import { Router } from "express";
import {
  createPresentationQR,
  getUserPresentations,
  getPresentationById,
  updatePresentation,
  deletePresentation,
  trackPageView,
  getPresentationAnalytics,
} from "./PresentationQR.controller";
import { asyncHandler } from "../../../middlewares/asyncHandler.middleware";
import {
  verifyAuth,
  individualOnly,
} from "../../../middlewares/roleVerification.middleware";

const presentationRouter = Router();

/**
 * @swagger
 * tags:
 *   name: PresentationQR
 *   description: API endpoints to manage Presentation QR codes
 */

/**
 * @swagger
 * /api/presentation:
 *   post:
 *     summary: Create a new presentation QR code
 *     description: Create a new presentation with QR code for brochures, announcements, magazines, etc.
 *     tags: [PresentationQR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - presentation_type
 *               - file_type
 *               - total_pages
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Product Catalog 2024"
 *               description:
 *                 type: string
 *               presentation_type:
 *                 type: string
 *                 enum: [brochure, announcement, magazine, event_program, project_presentation, analytics_report, catalog, menu, other]
 *               file_url:
 *                 type: string
 *               file_type:
 *                 type: string
 *                 enum: [pdf, images, mixed]
 *               total_pages:
 *                 type: integer
 *               pages:
 *                 type: array
 *               viewer_settings:
 *                 type: object
 *               access_settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Presentation QR code created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
presentationRouter
  .route("/")
  .post(verifyAuth, individualOnly, asyncHandler(createPresentationQR));

/**
 * @swagger
 * /api/presentation:
 *   get:
 *     summary: Get all presentations for authenticated user
 *     description: Retrieve all presentation QR codes created by the authenticated user
 *     tags: [PresentationQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: presentation_type
 *         schema:
 *           type: string
 *         description: Filter by presentation type
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of presentations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
presentationRouter
  .route("/")
  .get(verifyAuth, individualOnly, asyncHandler(getUserPresentations));

/**
 * @swagger
 * /api/presentation/{id}:
 *   post:
 *     summary: Get presentation by ID or short code
 *     description: Retrieve a specific presentation by its ID or short code (may require password)
 *     tags: [PresentationQR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID or short code
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Required if presentation is password protected
 *     responses:
 *       200:
 *         description: Presentation retrieved successfully
 *       401:
 *         description: Password required or incorrect
 *       403:
 *         description: Presentation expired or view limit reached
 *       404:
 *         description: Presentation not found
 */
presentationRouter.route("/:id").post(asyncHandler(getPresentationById));

/**
 * @swagger
 * /api/presentation/{id}:
 *   put:
 *     summary: Update presentation
 *     description: Update an existing presentation (owner only)
 *     tags: [PresentationQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               viewer_settings:
 *                 type: object
 *               styling:
 *                 type: object
 *               access_settings:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Presentation updated successfully
 *       404:
 *         description: Presentation not found
 *       401:
 *         description: Unauthorized
 */
presentationRouter
  .route("/:id")
  .put(verifyAuth, individualOnly, asyncHandler(updatePresentation));

/**
 * @swagger
 * /api/presentation/{id}:
 *   delete:
 *     summary: Delete presentation
 *     description: Delete an existing presentation (owner only)
 *     tags: [PresentationQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID
 *     responses:
 *       200:
 *         description: Presentation deleted successfully
 *       404:
 *         description: Presentation not found
 *       401:
 *         description: Unauthorized
 */
presentationRouter
  .route("/:id")
  .delete(verifyAuth, individualOnly, asyncHandler(deletePresentation));

/**
 * @swagger
 * /api/presentation/{id}/track-view:
 *   post:
 *     summary: Track page view
 *     description: Track when a specific page is viewed (for analytics)
 *     tags: [PresentationQR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - page_number
 *             properties:
 *               page_number:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Page view tracked successfully
 *       404:
 *         description: Presentation not found
 */
presentationRouter.route("/:id/track-view").post(asyncHandler(trackPageView));

/**
 * @swagger
 * /api/presentation/{id}/analytics:
 *   get:
 *     summary: Get presentation analytics
 *     description: Get analytics data for a specific presentation (owner only)
 *     tags: [PresentationQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       404:
 *         description: Presentation not found
 *       401:
 *         description: Unauthorized
 */
presentationRouter
  .route("/analytics/:id")
  .get(verifyAuth, individualOnly, asyncHandler(getPresentationAnalytics));

export default presentationRouter;
