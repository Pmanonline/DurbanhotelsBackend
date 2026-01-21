import { Router } from "express";
import {
  individualUserRegistration,
  resetIndividualPassword,
  verifyEmail,
  individualUserLogin,
  resendVerificationEmail,
  forgotPassword,
} from "../individualUserAuth/individualUserAuth.controller";
import {
  handleGoogleLogin,
  initiateTwitterAuth,
  handleTwitterCallback,
  handleFacebookLogin,
  updateTwitterUserEmail,
} from "../individualUserAuth/socialAuth.controller";
import { asyncHandler } from "../../../middlewares/asyncHandler.middleware";
import { refreshAccessToken } from "../../../utilities/refreshController";

const individualrouter = Router();

/**
 * @swagger
 * tags:
 *   name: IndividualUserAuth
 *   description: Api endpoint to manage individual auth
 */

/**
 * @swagger
 *   /auth/individual/signup:
 *     post:
 *       summary: Sign up an individual user
 *       description: Sign up a new user for the organization.
 *       tags: [IndividualUserAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IndividualUserSignup"
 *       responses:
 *         '200':
 *           description: User successfully signed up
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: "#/components/schemas/IndividualUserSignup"
 *         '400':
 *           $ref: "#/components/responses/400"
 *         '401':
 *           $ref: "#/components/responses/401"
 */
individualrouter
  .route("/signup")
  .post(asyncHandler(individualUserRegistration));

/**
 * @swagger
 *   /auth/individual/login:
 *     post:
 *       summary: Log in an individual user
 *       description: Log in an existing individual user with email and password.
 *       tags: [IndividualUserAuth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   example: "petersonzoconis1@gmail.com"
 *                 password:
 *                   type: string
 *                   example: "newpassword123"
 *               required:
 *                 - email
 *                 - password
 *       responses:
 *         '200':
 *           description: User successfully logged in
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *                   token:
 *                     type: string
 *         '400':
 *           $ref: "#/components/responses/400"
 *         '404':
 *           description: User not found
 *         '401':
 *           description: Invalid credentials
 */
individualrouter.route("/login").post(asyncHandler(individualUserLogin));

/**
 * @swagger
 *   /auth/individual/verify-email:
 *     get:
 *       summary: Verify individual user email
 *       description: Verify a user's email using the provided token.
 *       tags: [IndividualUserAuth]
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
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *         '400':
 *           description: Invalid or expired token
 *         '404':
 *           description: User not found
 *         '500':
 *           description: Internal server error
 */
individualrouter.get("/verify-email", verifyEmail);

/**
 * @swagger
 *   /auth/individual/resend-verification:
 *     post:
 *       summary: Resend verification email
 *       description: Resend email verification link to the user's email address.
 *       tags: [IndividualUserAuth]
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
 *                   example: "user@example.com"
 *               required:
 *                 - email
 *       responses:
 *         '200':
 *           description: Verification email sent successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *         '400':
 *           description: Email is required or email already verified
 *         '404':
 *           description: User not found
 *         '500':
 *           description: Internal server error
 */
individualrouter
  .route("/resend-verification")
  .post(asyncHandler(resendVerificationEmail));

/**
 * @swagger
 *   /auth/individual/forgot-password:
 *     post:
 *       summary: Request password reset
 *       description: Send a password reset link to the user's email address.
 *       tags: [IndividualUserAuth]
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
 *                   example: "user@example.com"
 *               required:
 *                 - email
 *       responses:
 *         '200':
 *           description: Password reset link sent successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *         '400':
 *           description: Email is required
 *         '404':
 *           description: User not found
 *         '500':
 *           description: Internal server error
 */
individualrouter.route("/forgot-password").post(asyncHandler(forgotPassword));

/**
 * @swagger
 *   /auth/individual/reset-password:
 *     post:
 *       summary: Reset user password
 *       description: Reset user password using the token from email.
 *       tags: [IndividualUserAuth]
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
 *                   example: "newpassword123"
 *                 confirm_password:
 *                   type: string
 *                   format: password
 *                   example: "newpassword123"
 *               required:
 *                 - password
 *                 - confirm_password
 *       responses:
 *         '200':
 *           description: Password reset successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   message:
 *                     type: string
 *         '400':
 *           description: Invalid token, missing fields, or passwords don't match
 *         '404':
 *           description: User not found
 *         '500':
 *           description: Internal server error
 */
individualrouter
  .route("/reset-password")
  .post(asyncHandler(resetIndividualPassword));

// SOCIAL ROUTES

individualrouter.route("/google").post(asyncHandler(handleGoogleLogin));

individualrouter.route("/facebook").post(asyncHandler(handleFacebookLogin));

individualrouter
  .route("/twitter/callback")
  .post(asyncHandler(handleTwitterCallback));

individualrouter.get("/twitter", initiateTwitterAuth);

individualrouter
  .route("/update-email")
  .post(asyncHandler(updateTwitterUserEmail));
individualrouter.route("/refresh-token").post(asyncHandler(refreshAccessToken));

// refreshToken Route is passed here

export default individualrouter;
