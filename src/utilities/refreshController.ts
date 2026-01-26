import { Request, Response, NextFunction } from "express";
import { verifyJwt, signJwt } from "./signAndVerifyToken.util";
import { Session } from "../modules/sessions/session.model";
import { ErrorResponse } from "./errorHandler.util";
import IndividualUser from "../modules/authentication/individualUserAuth/individualUserAuth.model1";
import { getCookieOptions } from "./cookieConfig.util";

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies["refresh_token"];

    if (!refreshToken) {
      const error: ErrorResponse = {
        statusCode: 401,
        status: "fail",
        message: "No refresh token provided",
      };
      return next(error);
    }

    const { decoded, valid, expired } = verifyJwt(refreshToken);

    if (!valid || !decoded) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: expired ? "Refresh token expired" : "Invalid refresh token",
      };
      return next(error);
    }

    const sessionId = decoded.session;

    if (!sessionId) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Invalid token format - no session found",
      };
      return next(error);
    }

    const session = await Session.findById(sessionId);

    if (!session || !session.valid) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Session not found or invalid",
      };
      return next(error);
    }

    if (session.refreshToken !== refreshToken) {
      const error: ErrorResponse = {
        statusCode: 403,
        status: "fail",
        message: "Refresh token mismatch - possible token reuse detected",
      };
      return next(error);
    }

    let user: any = null;

    if (session.role === "ind" || session.role === "g-ind") {
      user = await IndividualUser.findById(session.user).select(
        "_id email phone_number role",
      );
    }

    if (!user) {
      const error: ErrorResponse = {
        statusCode: 404,
        status: "fail",
        message: "User not found",
      };
      return next(error);
    }

    // ✅ FIXED: Include email in the token payload
    const tokenPayload = {
      userData: {
        _id: session.user.toString(),
        email: user.email, // ✅ ADD THIS - Critical fix!
        role: session.role,
      },
      session: session._id.toString(),
      role: session.role,
    };

    // Generate new access token with complete user data
    const newAccessToken = signJwt(tokenPayload, { expiresIn: "1d" });

    // Generate new refresh token (token rotation) with complete user data
    const newRefreshToken = signJwt(tokenPayload, { expiresIn: "30d" });

    // Update session with new refresh token
    session.refreshToken = newRefreshToken;
    await session.save();

    res.cookie(
      "access_token",
      newAccessToken,
      getCookieOptions(1 * 60 * 1000), // 1 minute
    );

    res.cookie(
      "refresh_token",
      newRefreshToken,
      getCookieOptions(30 * 24 * 60 * 60 * 1000), // 30 days
    );

    return res.status(200).json({
      status: "success",
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role || session.role,
      },
    });
  } catch (error) {
    const errResponse: ErrorResponse = {
      statusCode: 500,
      status: "error",
      message: "Error refreshing access token",
      stack: error instanceof Error ? { stack: error.stack } : undefined,
    };
    next(errResponse);
  }
};
