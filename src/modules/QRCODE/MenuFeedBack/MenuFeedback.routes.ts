import { Router } from "express";
import {
  submitMenuFeedback,
  getMenuFeedback,
  getOwnerMenuFeedback,
  deleteFeedback,
  getUserMenus,
} from "./MenuFeedback.controller";
import { asyncHandler } from "../../../middlewares/asyncHandler.middleware";
import {
  verifyAuth,
  individualOnly,
} from "../../../middlewares/roleVerification.middleware";
import { rateLimiter } from "../../../middlewares/rateLimiter.middleware";

const feedbackRouter = Router();

// Rate limiting for public submissions
const feedbackRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many feedback submissions. Please try again later.",
});

/**
 * @swagger
 * tags:
 *   name: MenuFeedback
 *   description: Menu feedback and reviews management
 */

/**
 * @swagger
 * /api/menu-feedback:
 *   post:
 *     summary: Submit feedback for a menu
 *     description: Submit a review, report, suggestion, or comment for a menu
 *     tags: [MenuFeedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu_id
 *               - type
 *               - message
 *             properties:
 *               menu_id:
 *                 type: string
 *                 example: "65f8a1b2c3d4e5f6a7b8c9d0"
 *               type:
 *                 type: string
 *                 enum: [review, report, suggestion, comment, rating]
 *                 example: "review"
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               title:
 *                 type: string
 *                 example: "Great food!"
 *               message:
 *                 type: string
 *                 example: "The pasta was amazing, will definitely come back."
 *               category:
 *                 type: string
 *                 enum: [food_quality, service, pricing, hygiene, atmosphere, other]
 *                 example: "food_quality"
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many submissions
 */
feedbackRouter
  .route("/")
  .post(feedbackRateLimiter, asyncHandler(submitMenuFeedback));

/**
 * @swagger
 * /api/menu-feedback/public/{menu_id}:
 *   get:
 *     summary: Get public feedback for a menu
 *     description: Get reviews and comments for public viewing
 *     tags: [MenuFeedback]
 *     parameters:
 *       - in: path
 *         name: menu_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by feedback type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *       404:
 *         description: Menu not found
 */
feedbackRouter.route("/public/:menu_id").get(asyncHandler(getMenuFeedback));

/**
 * @swagger
 * /api/menu-feedback/owner/{menu_id}:
 *   get:
 *     summary: Get feedback for menu owner (private)
 *     description: Get all feedback including private reports and suggestions
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menu_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not menu owner
 */
feedbackRouter
  .route("/owner/:menu_id")
  .get(verifyAuth, individualOnly, asyncHandler(getOwnerMenuFeedback));

/**
 * @swagger
 * /api/menu-feedback/{feedback_id}:
 *   delete:
 *     summary: Archive feedback
 *     description: Menu owner can archive feedback (soft delete)
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedback_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback archived successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not menu owner
 */
feedbackRouter
  .route("/:feedback_id")
  .delete(verifyAuth, individualOnly, asyncHandler(deleteFeedback));

feedbackRouter
  .route("/user-menus")
  .get(verifyAuth, individualOnly, asyncHandler(getUserMenus));

export default feedbackRouter;
