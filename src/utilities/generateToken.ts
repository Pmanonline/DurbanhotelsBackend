import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET || "secret", {
    expiresIn: "1h",
  });
};

export const generateAccessAndRefreshToken = (
  userId: string
): {
  accessToken: string;
  refreshToken: string;
} => {
  const accessToken = generateAccessToken(userId);

  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET || "secret",
    {
      expiresIn: "7d",
    }
  );

  return { accessToken, refreshToken };
};
