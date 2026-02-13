"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminAuth_controller_1 = require("../adminUserAuth/AdminAuth.controller");
const asyncHandler_middleware_1 = require("../../../middlewares/asyncHandler.middleware");
const adminRouter = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: AdminAuth
 *   description: API endpoints to manage admin authentication
 */
/**
 * @swagger
 *   /auth/admin/signup:
 *     post:
 *       summary: Sign up an admin user
 *       description: Create a new admin account for the platform.
 *       tags: [AdminAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "John Admin"
 *                 username:
 *                   type: string
 *                   example: "johnadmin"
 *                 email:
 *                   type: string
 *                   example: "admin@mydoshbox.com"
 *                 phone_number:
 *                   type: string
 *                   example: "+1234567890"
 *                 password:
 *                   type: string
 *                   example: "SecurePass123!"
 *                 confirm_password:
 *                   type: string
 *                   example: "SecurePass123!"
 *               required:
 *                 - name
 *                 - email
 *                 - password
 *                 - confirm_password
 *       responses:
 *         '201':
 *           description: Admin user successfully signed up
 *         '400':
 *           $ref: "#/components/responses/400"
 *         '401':
 *           $ref: "#/components/responses/401"
 */
adminRouter.route("/signup").post((0, asyncHandler_middleware_1.asyncHandler)(AdminAuth_controller_1.adminUserRegistration));
/**
 * @swagger
 *   /auth/admin/login:
 *     post:
 *       summary: Log in an admin user
 *       description: Log in an existing admin user with email and password.
 *       tags: [AdminAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   example: "admin@mydoshbox.com"
 *                 password:
 *                   type: string
 *                   example: "SecurePass123!"
 *               required:
 *                 - email
 *                 - password
 *       responses:
 *         '200':
 *           description: Admin user successfully logged in
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *                   admin:
 *                     type: object
 *                   accessToken:
 *                     type: string
 *                   refreshToken:
 *                     type: string
 *         '400':
 *           $ref: "#/components/responses/400"
 *         '404':
 *           description: Admin user not found
 *         '401':
 *           description: Invalid credentials
 */
adminRouter.route("/login").post((0, asyncHandler_middleware_1.asyncHandler)(AdminAuth_controller_1.adminUserLogin));
/**
 * @swagger
 *   /auth/admin/verify-email:
 *     get:
 *       summary: Verify admin user email
 *       description: Verify an admin user's email using the provided token.
 *       tags: [AdminAuth]
 *       parameters:
 *         - in: query
 *           name: token
 *           schema:
 *             type: string
 *           required: true
 *           description: The JWT token sent via email for verification
 *       responses:
 *         '200':
 *           description: Email verified successfully
 *         '400':
 *           description: Invalid or expired token
 *         '404':
 *           description: Admin user not found
 *         '500':
 *           description: Internal server error
 */
adminRouter.get("/verify-email", AdminAuth_controller_1.verifyAdminEmail);
/**
 * @swagger
 *   /auth/admin/resend-verification:
 *     post:
 *       summary: Resend admin verification email
 *       description: Resend email verification link to the admin user's email address.
 *       tags: [AdminAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "admin@mydoshbox.com"
 *               required:
 *                 - email
 *       responses:
 *         '200':
 *           description: Verification email sent successfully
 *         '400':
 *           description: Email is required or email already verified
 *         '404':
 *           description: Admin user not found
 *         '500':
 *           description: Internal server error
 */
adminRouter
    .route("/resend-verification")
    .post((0, asyncHandler_middleware_1.asyncHandler)(AdminAuth_controller_1.resendAdminVerificationEmail));
/**
 * @swagger
 *   /auth/admin/forgot-password:
 *     post:
 *       summary: Request admin password reset
 *       description: Send a password reset link to the admin user's email address.
 *       tags: [AdminAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "admin@mydoshbox.com"
 *               required:
 *                 - email
 *       responses:
 *         '200':
 *           description: Password reset link sent successfully
 *         '400':
 *           description: Email is required
 *         '404':
 *           description: Admin user not found
 *         '500':
 *           description: Internal server error
 */
adminRouter.route("/forgot-password").post((0, asyncHandler_middleware_1.asyncHandler)(AdminAuth_controller_1.forgotAdminPassword));
/**
 * @swagger
 *   /auth/admin/reset-password:
 *     post:
 *       summary: Reset admin user password
 *       description: Reset admin user password using the token from email.
 *       tags: [AdminAuth]
 *       parameters:
 *         - in: query
 *           name: token
 *           schema:
 *             type: string
 *           required: true
 *           description: The password reset token sent via email
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 password:
 *                   type: string
 *                   format: password
 *                   example: "NewSecurePass123!"
 *                 confirm_password:
 *                   type: string
 *                   format: password
 *                   example: "NewSecurePass123!"
 *               required:
 *                 - password
 *                 - confirm_password
 *       responses:
 *         '200':
 *           description: Password reset successfully
 *         '400':
 *           description: Invalid token, missing fields, or passwords don't match
 *         '404':
 *           description: Admin user not found
 *         '500':
 *           description: Internal server error
 */
adminRouter.route("/reset-password").post((0, asyncHandler_middleware_1.asyncHandler)(AdminAuth_controller_1.resetAdminPassword));
exports.default = adminRouter;
