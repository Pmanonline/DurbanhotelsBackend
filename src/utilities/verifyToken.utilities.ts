import jwt from "jsonwebtoken";

export function verifyJwt(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      _id: string;
      email: string;
    };
    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (e: any) {
    return {
      valid: false,
      expired: e.message === "jwt expired",
      decoded: null,
    };
  }
}
