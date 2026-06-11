import {
    getCrossDepartmentAnalytics,
    getDashboardIntelligence,
    getDepartmentAnalytics,
    getFormAnalytics
} from "./analytics.service.js";

export const formAnalytics = async (req, res) => {
    try {
        const { formId } = req.params;
        const data = await getFormAnalytics(formId, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        // Differentiate privacy errors from normal bad requests
        const statusCode = error.message.includes("At least") || error.message.includes("privacy threshold") ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const averageRatings = async (req, res) => {
    // This could just be a wrapper around getFormAnalytics, filtering only RATING questions,
    // or we can just send everything and let the client filter.
    // For now, we reuse the robust privacy-safe aggregation.
    try {
        const { formId } = req.params;
        const data = await getFormAnalytics(formId, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        const statusCode = error.message.includes("At least") || error.message.includes("privacy threshold") ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const departmentAnalytics = async (req, res) => {
    try {
        const data = await getDepartmentAnalytics(req.params.departmentId, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const crossDepartmentAnalytics = async (req, res) => {
    try {
        const data = await getCrossDepartmentAnalytics(req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const adminIntelligence = async (req, res) => {
    try {
        const data = await getDashboardIntelligence(req.user, "ADMIN");
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const facultyIntelligence = async (req, res) => {
    try {
        const data = await getDashboardIntelligence(req.user, "FACULTY");
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
