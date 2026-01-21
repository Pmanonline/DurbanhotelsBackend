import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  updateBankDetails,
  getBankDetails,
} from "./userProfile.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import { verifyAuth } from "../../middlewares/roleVerification.middleware";

const userProfileRouter = Router();

/**
 * @swagger
 * tags:
 *   name: UserProfile
 *   description: API endpoints for user profile management
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [UserProfile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *       '401':
 *         description: User not authenticated
 *       '404':
 *         description: Profile not found
 */
userProfileRouter
  .route("/getUserProfile")
  .get(verifyAuth, asyncHandler(getUserProfile));

/**
 * @swagger
 * /profile/update:
 *   put:
 *     summary: Update user profile
 *     description: Update user profile information (email, phone, name)
 *     tags: [UserProfile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       '200':
 *         description: Profile updated successfully
 *       '400':
 *         description: Invalid input
 *       '401':
 *         description: User not authenticated
 *       '404':
 *         description: Profile not found
 */
userProfileRouter
  .route("/update")
  .put(verifyAuth, asyncHandler(updateUserProfile));

/**
 * @swagger
 * /profile/bank-details:
 *   get:
 *     summary: Get bank details
 *     description: Retrieve the user's bank account information
 *     tags: [UserProfile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Bank details retrieved successfully
 *       '401':
 *         description: User not authenticated
 *       '404':
 *         description: Profile not found
 */
userProfileRouter
  .route("/bank-details")
  .get(verifyAuth, asyncHandler(getBankDetails));

/**
 * @swagger
 * /profile/bank-details:
 *   put:
 *     summary: Update bank details
 *     description: Update or add user's bank account information
 *     tags: [UserProfile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account_number:
 *                 type: string
 *                 example: "1234567890"
 *               bank_name:
 *                 type: string
 *                 example: "First Bank"
 *               account_name:
 *                 type: string
 *                 example: "John Doe"
 *               bank_code:
 *                 type: string
 *                 example: "011"
 *             required:
 *               - account_number
 *               - bank_name
 *               - account_name
 *     responses:
 *       '200':
 *         description: Bank details updated successfully
 *       '400':
 *         description: Missing required fields
 *       '401':
 *         description: User not authenticated
 *       '404':
 *         description: Profile not found
 */
userProfileRouter
  .route("/bank-details")
  .put(verifyAuth, asyncHandler(updateBankDetails));

export default userProfileRouter;
