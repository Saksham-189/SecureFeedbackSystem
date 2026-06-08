import rateLimit from "express-rate-limit";

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for Auth endpoints (e.g., login, register) - 5 attempts per 15 minutes in prod, 50 in dev
// Protects against brute force and credential stuffing
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: {
        success: false,
        message: "Too many login attempts, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
});
