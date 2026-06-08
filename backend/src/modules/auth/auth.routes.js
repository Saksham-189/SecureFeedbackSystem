import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import validate from "../../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import {
    register,
    login,
    logout,
    refreshSession,
    getMetadata
} from "./auth.controller.js";

const router = express.Router();

// Apply strict rate limiting to auth endpoints
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refreshSession);
router.get("/metadata", getMetadata);

// Return currently authenticated user
router.get(
    "/me",
    authMiddleware,
    async (req, res) => {
        res.json({
            success: true,
            user: req.user
        });
    }
);

export default router;