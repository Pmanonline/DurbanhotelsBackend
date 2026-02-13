"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieOptions = void 0;
const getCookieOptions = (maxAge) => {
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
        options: Object.assign({ httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", maxAge, path: "/" }, (isProduction && cleanDomain ? { domain: cleanDomain } : {})),
        maxAgeMinutes: maxAge / 60000,
    });
    return Object.assign({ httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", maxAge, path: "/" }, (isProduction && cleanDomain ? { domain: cleanDomain } : {}));
};
exports.getCookieOptions = getCookieOptions;
