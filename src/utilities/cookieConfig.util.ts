export const getCookieOptions = (maxAge: number) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN || "";

  // Clean domain - remove protocol, trailing slashes, 'www'
  const cleanDomain = cookieDomain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "");

  console.log("🍪 Cookie Configuration:", {
    NODE_ENV: process.env.NODE_ENV,
    isProduction,
    rawCookieDomain: cookieDomain,
    cleanDomain,
    willSetDomain: isProduction && !!cleanDomain,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge,
      path: "/",
      ...(isProduction && cleanDomain ? { domain: cleanDomain } : {}),
    },
    maxAgeMinutes: maxAge / 60000,
  });

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge,
    path: "/",
    ...(isProduction && cleanDomain ? { domain: cleanDomain } : {}),
  };
};
