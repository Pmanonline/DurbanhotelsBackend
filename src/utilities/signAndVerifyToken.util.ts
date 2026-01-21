import jwt from "jsonwebtoken";

export interface JWTPayload {
  userData: {
    _id: string;
    role: string;
  };
  session: string;
  role: string;
}

export interface SignOptions {
  expiresIn: string | number;
}

export interface VerifyResult {
  decoded: JWTPayload | null;
  expired: boolean;
  valid: boolean;
}

export const signJwt = (payload: JWTPayload, options?: SignOptions): string => {
  const secret = process.env.JWT_SECRET as string;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(payload, secret, {
    ...(options && options),
  });
};

export const verifyJwt = (token: string): VerifyResult => {
  const secret = process.env.JWT_SECRET as string;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return {
      decoded,
      expired: false,
      valid: true,
    };
  } catch (error: any) {
    return {
      decoded: null,
      expired: error.message?.includes("jwt expired"),
      valid: false,
    };
  }
};
