"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuFeedback_controller_1 = require("./MenuFeedback.controller");
const asyncHandler_middleware_1 = require("../../../middlewares/asyncHandler.middleware");
const roleVerification_middleware_1 = require("../../../middlewares/roleVerification.middleware");
const rateLimiter_middleware_1 = require("../../../middlewares/rateLimiter.middleware");
const feedbackRouter = (0, express_1.Router)();
const feedbackRateLimiter = (0, rateLimiter_middleware_1.rateLimiter)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many feedback submissions. Please try again later.",
});
/**
 * @swagger
 * tags:
 *   name: MenuFeedback
 *   description: Menu feedback and reviews management
 */
// ─────────────────────────────────────────────
// STATIC / SPECIFIC ROUTES  (must come first)
// ─────────────────────────────────────────────
/**
 * @swagger
 * /api/menu-feedback:
 *   post:
 *     summary: Submit feedback for a menu
 *     tags: [MenuFeedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menu_id, type, message]
 *             properties:
 *               menu_id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [review, report, suggestion, comment, rating]
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [food_quality, service, pricing, hygiene, atmosphere, other]
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
    .post(feedbackRateLimiter, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.submitMenuFeedback));
/**
 * @swagger
 * /api/menu-feedback/user-menus:
 *   get:
 *     summary: Get all menus belonging to the authenticated user
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Menus retrieved successfully
 *       401:
 *         description: Unauthorized
 */
feedbackRouter
    .route("/user-menus")
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.getUserMenus));
/**
 * @swagger
 * /api/menu-feedback/public/{menu_id}:
 *   get:
 *     summary: Get public feedback for a menu
 *     tags: [MenuFeedback]
 *     parameters:
 *       - in: path
 *         name: menu_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *       404:
 *         description: Menu not found
 */
feedbackRouter.route("/public/:menu_id").get((0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.getMenuFeedback));
/**
 * @swagger
 * /api/menu-feedback/owner/{menu_id}:
 *   get:
 *     summary: Get all feedback for a menu (owner only)
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menu_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, read, archived]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
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
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.getOwnerMenuFeedback));
/**
 * @swagger
 * /api/menu-feedback/owner/{menu_id}/read-all:
 *   patch:
 *     summary: Mark all pending feedback as read for a menu (owner only)
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menu_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All feedback marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not menu owner
 */
feedbackRouter
    .route("/owner/:menu_id/read-all")
    .patch(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.markAllAsRead));
// ─────────────────────────────────────────────
// PARAMETERIZED ROUTES  (must come last)
// ─────────────────────────────────────────────
/**
 * @swagger
 * /api/menu-feedback/{feedback_id}/read:
 *   patch:
 *     summary: Mark a single feedback as read (owner only)
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedback_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not menu owner
 *       404:
 *         description: Feedback not found
 */
feedbackRouter
    .route("/:feedback_id/read")
    .patch(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.markAsRead));
/**
 * @swagger
 * /api/menu-feedback/{feedback_id}:
 *   delete:
 *     summary: Delete feedback permanently (owner only)
 *     tags: [MenuFeedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedback_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not menu owner
 *       404:
 *         description: Feedback not found
 */
feedbackRouter
    .route("/:feedback_id")
    .delete(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuFeedback_controller_1.deleteFeedback));
exports.default = feedbackRouter;
