import * as profileService from "./profile.service.js";

export const getProfile = async (req, res) => {
    try {
        const data = await profileService.getProfile(req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const data = await profileService.updateProfile(req.body, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const data = await profileService.changePassword(req.body, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
