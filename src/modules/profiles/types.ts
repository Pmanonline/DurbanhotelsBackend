import { Request } from "express";
import { Types } from "mongoose";

export interface AuthenticatedUser {
  id: string; // Use 'id' instead of '_id' to match your middleware
  email: string;
  role: string;
  sessionId?: string;
}

export interface AuthenticatedRequest<T = any> extends Request {
  user?: AuthenticatedUser;
  body: T;
  files?: {
    [key: string]: any; // or UploadedFile if using express-fileupload
  } | null;
}

// types/userProfile.types.ts
export interface UpdateProfileBody {
  email?: string;
  phone_number?: string;
  name?: string;
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
