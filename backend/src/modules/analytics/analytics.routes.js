import express from "express";

import authMiddleware
    from "../../middleware/auth.middleware.js";

import rbacMiddleware
    from "../../middleware/rbac.middleware.js";

import { ROLES }
    from "../../constants/roles.js";

import {
    adminIntelligence,
    crossDepartmentAnalytics,
    departmentAnalytics,
    facultyIntelligence,
    formAnalytics,
    averageRatings
} from "./analytics.controller.js";

const router = express.Router();

router.get(
    "/admin/intelligence",
    authMiddleware,
    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN
    ),
    adminIntelligence
);

router.get(
    "/faculty/intelligence",
    authMiddleware,
    rbacMiddleware(
        ROLES.FACULTY
    ),
    facultyIntelligence
);

router.get(
    "/departments",
    authMiddleware,
    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.FACULTY,
        ROLES.SUPER_ADMIN
    ),
    crossDepartmentAnalytics
);

router.get(
    "/department/:departmentId",
    authMiddleware,
    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.FACULTY,
        ROLES.SUPER_ADMIN
    ),
    departmentAnalytics
);

router.get(
    "/form/:formId",

    authMiddleware,

    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.FACULTY,
        ROLES.SUPER_ADMIN
    ),

    formAnalytics
);

router.get(
    "/average/:formId",

    authMiddleware,

    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.FACULTY,
        ROLES.SUPER_ADMIN
    ),

    averageRatings
);

export default router;
