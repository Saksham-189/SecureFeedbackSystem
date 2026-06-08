import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m"; // Short lived for security
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generates a short-lived access token.
 */
export const generateAccessToken = (payload) => {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY
    });
};

/**
 * Calculates the expiry date for a refresh token.
 */
export const getRefreshTokenExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return date;
};
