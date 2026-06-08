import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import rbacMiddleware from "../../middleware/rbac.middleware.js";
import { ROLES } from "../../constants/roles.js";
import {
    getUsers,
    createUser,
    updateUserStatus,
    getAuditLogs,
    getSystemAnomalies,
    getSecurityMetrics
} from "./admin.controller.js";

const router = express.Router();

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

router.get(
    "/users",
    authMiddleware,
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    getUsers
);

router.post(
    "/users",
    authMiddleware,
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    createUser
);

router.patch(
    "/users/:userId/status",
    authMiddleware,
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    updateUserStatus
);

// ==========================================
// AUDIT & MONITORING ROUTES
// ==========================================

router.get(
    "/security-metrics",
    authMiddleware,
    rbacMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    getSecurityMetrics
);

router.get(
    "/audit-logs",
    authMiddleware,
    rbacMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    getAuditLogs
);

router.get(
    "/anomalies",
    authMiddleware,
    rbacMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    getSystemAnomalies
);

export default router;
