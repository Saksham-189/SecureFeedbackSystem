import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import academicRoutes from "./modules/academic/academic.routes.js";
import campaignRoutes from "./modules/campaign/campaign.routes.js";
import enrollmentRoutes from "./modules/enrollment/enrollment.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";

import { apiLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection, getCsrfToken } from "./middleware/csrf.middleware.js";

const app = express();

// Trust proxy for secure cookies behind reverse proxies (e.g., Render, Heroku, Nginx)
app.set("trust proxy", 1);

app.use(express.json());

const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, "http://localhost:5173"] 
    : ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "x-device-fingerprint"]
}));

// Hardened Helmet configuration
// Disable CSP because the frontend is a separate SPA that makes cross-origin API calls.
// CSP is best enforced by the frontend hosting provider (Vercel/Netlify headers).
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Apply CSRF Protection
app.use(csrfProtection);
app.get("/api/csrf-token", getCsrfToken);

// Apply Global Rate Limiting
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Secure Feedback API Running"
  });
});

export default app;
