import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import rbacMiddleware from "../../middleware/rbac.middleware.js";
import { ROLES } from "../../constants/roles.js";
import * as enrollmentController from "./enrollment.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
    "/",
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    enrollmentController.listEnrollments
);

router.post(
    "/",
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    enrollmentController.addEnrollment
);

router.post(
    "/bulk",
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    enrollmentController.addBulkEnrollments
);

router.get(
    "/course-assignments",
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY),
    enrollmentController.listCourseAssignments
);

router.post(
    "/course-assignments",
    rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    enrollmentController.addCourseAssignment
);

export default router;
