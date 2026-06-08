import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import rbacMiddleware from "../middleware/rbac.middleware.js";

import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.get(
    "/dashboard",
    authMiddleware,
    rbacMiddleware(
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN
    ),
    (req, res) => {

        res.json({
            success: true,
            message: "Welcome Admin"
        });
    }
);

export default router;