import { Request } from "express";
import { Types } from "mongoose";

// In your types/userProfile.types.ts or types/index.ts
export interface AuthenticatedUser {
  _id: string; // Add this to match your middleware
  id: string; // Keep this
  email: string;
  role: string;
  session?: string; // Change from sessionId? to session?
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest<T = any> extends Request {
  user?: AuthenticatedUser;
  body: T;
  files?: {
    [key: string]: any;
  } | null;
}

// types/userProfile.types.ts
export interface UpdateProfileBody {
  email?: string;
  phone_number?: string;
  name?: string;
  username?: string;
}

export interface UpdateBankDetailsBody {
  account_number: string;
  bank_name: string;
  account_name: string;
  bank_code?: string;
}

export interface CreateProfileBody {
  user_id: string;
  email: string;
  phone_number?: string;
  name?: string;
  username?: string;
}
