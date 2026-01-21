import mongoose from "mongoose";
import { signJwt } from "./signAndVerifyToken.util";
import { Session, ISessionDocument } from "../modules/sessions/session.model";

export interface UserData {
  _id: mongoose.Types.ObjectId | string;
  email: string;
  phone_number?: string;
  role: string;
  organization_email?: string;
  contact_email?: string;
}

export interface CreateSessionParams {
  user: UserData;
  userAgent: string;
  role: string;
  message?: string;
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  message: string;
  user: UserData;
  status: string;
  sessionId: string;
}

export const createSessionAndSendTokens = async ({
  user,
  userAgent,
  role,
  message = "Login successful",
}: CreateSessionParams): Promise<SessionResponse> => {
  // Use user.role if provided, otherwise use the role parameter
  const userRole = user.role || role;

  // ✅ Get email (handle both individual and organization users)
  const userEmail = user.email || user.organization_email || user.contact_email;

  if (!userEmail) {
    throw new Error("User email is required for session creation");
  }

  // Create session with empty refreshToken initially
  const session: ISessionDocument = await Session.create({
    user: user._id,
    userAgent: userAgent || "unknown",
    role: userRole,
    valid: true,
    refreshToken: "",
  });

  // Convert session._id to string for JWT payload
  const sessionId = session._id.toString();
  const userId = user._id.toString();

  // UPDATED: Include email in token payload
  const tokenPayload = {
    userData: {
      _id: userId,
      role: userRole,
      email: userEmail,
    },
    session: sessionId,
    role: userRole,
  };

  // Generate tokens with email included
  const accessToken = signJwt(tokenPayload, { expiresIn: "15m" });
  const refreshToken = signJwt(tokenPayload, { expiresIn: "30d" });

  // Update session with refreshToken
  session.refreshToken = refreshToken;
  await session.save();

  return {
    accessToken,
    refreshToken,
    message,
    user: {
      ...user,
      role: userRole,
    },
    status: "success",
    sessionId,
  };
};
