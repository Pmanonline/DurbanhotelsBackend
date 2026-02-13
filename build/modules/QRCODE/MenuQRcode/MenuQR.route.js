"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuQR_controller_1 = require("./MenuQR.controller");
const asyncHandler_middleware_1 = require("../../../middlewares/asyncHandler.middleware");
const roleVerification_middleware_1 = require("../../../middlewares/roleVerification.middleware");
const menuRouter = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: MenuQR
 *   description: API endpoints to manage Menu QR codes
 */
/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Create a new menu QR code
 *     description: Create a new menu with QR code for restaurant/catering business
 *     tags: [MenuQR]
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
 *               - business_name
 *               - categories
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Summer Menu 2024"
 *               description:
 *                 type: string
 *               business_name:
 *                 type: string
 *                 example: "Joe's Restaurant"
 *               business_logo:
 *                 type: string
 *               menu_type:
 *                 type: string
 *                 enum: [restaurant, catering, food_truck, cafe, bar, other]
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           available:
 *                             type: boolean
 *     responses:
 *       201:
 *         description: Menu QR code created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
menuRouter
    .route("/")
    .post(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.createMenuQR));
/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get all menus for authenticated user
 *     description: Retrieve all menu QR codes created by the authenticated user
 *     tags: [MenuQR]
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
 *     responses:
 *       200:
 *         description: List of menus retrieved successfully
 *       401:
 *         description: Unauthorized
 */
menuRouter
    .route("/")
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.getUserMenus));
/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get menu by ID or short code
 *     description: Retrieve a specific menu by its ID or short code (public access)
 *     tags: [MenuQR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID or short code
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
 *       404:
 *         description: Menu not found
 */
menuRouter.route("/:id").get((0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.getMenuById));
/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Update menu
 *     description: Update an existing menu (owner only)
 *     tags: [MenuQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               categories:
 *                 type: array
 *               styling:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu updated successfully
 *       404:
 *         description: Menu not found
 *       401:
 *         description: Unauthorized
 */
menuRouter
    .route("/:id")
    .put(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.updateMenu));
/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Delete menu
 *     description: Delete an existing menu (owner only)
 *     tags: [MenuQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu deleted successfully
 *       404:
 *         description: Menu not found
 *       401:
 *         description: Unauthorized
 */
menuRouter
    .route("/:id")
    .delete(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.deleteMenu));
/**
 * @swagger
 * /api/menu/{id}/analytics:
 *   get:
 *     summary: Get menu analytics
 *     description: Get analytics data for a specific menu (owner only)
 *     tags: [MenuQR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       404:
 *         description: Menu not found
 *       401:
 *         description: Unauthorized
 */
menuRouter
    .route("/analytics/:id")
    .get(roleVerification_middleware_1.verifyAuth, roleVerification_middleware_1.individualOnly, (0, asyncHandler_middleware_1.asyncHandler)(MenuQR_controller_1.getMenuAnalytics));
exports.default = menuRouter;
