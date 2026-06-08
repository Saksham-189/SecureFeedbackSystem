import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import rbacMiddleware from "../../middleware/rbac.middleware.js";
import { ROLES } from "../../constants/roles.js";

import { 
    createForm, 
    updateForm,
    deleteForm,
    getAdminForms,
    getForms,
    getForm,
    getMySubmissions,
    submitForm 
} from "./feedback.controller.js";

const router = express.Router();

// ==========================================
// ADMIN ROUTES (Form Builder)
// ==========================================

router.post(
  "/",
  authMiddleware,
  rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  createForm
);

router.put(
  "/:formId",
  authMiddleware,
  rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  updateForm
);

router.delete(
  "/:formId",
  authMiddleware,
  rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  deleteForm
);

router.get(
  "/admin/forms",
  authMiddleware,
  rbacMiddleware(ROLES.ADMIN, ROLES.FACULTY, ROLES.SUPER_ADMIN),
  getAdminForms
);

// ==========================================
// STUDENT ROUTES (Form Submission)
// ==========================================

// Both students and admins can view forms
router.get(
  "/",
  authMiddleware,
  getForms
);

router.get(
  "/submissions/me",
  authMiddleware,
  rbacMiddleware(ROLES.STUDENT),
  getMySubmissions
);

router.get(
  "/:formId",
  authMiddleware,
  getForm
);

router.post(
  "/:formId/submit",
  authMiddleware,
  rbacMiddleware(ROLES.STUDENT),
  submitForm
);

export default router;
