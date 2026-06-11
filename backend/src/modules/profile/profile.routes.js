import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import * as profileController from "./profile.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", profileController.getProfile);
router.patch("/", profileController.updateProfile);
router.post("/change-password", profileController.changePassword);

export default router;
