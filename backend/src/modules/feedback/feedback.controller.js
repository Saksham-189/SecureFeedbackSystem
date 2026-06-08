import {
    createFeedbackForm,
    updateFeedbackForm,
    deleteFeedbackForm,
    getFormsForAdmin,
    getStudentSubmissions,
    getAvailableForms,
    getFormById,
    submitFeedback
} from "./feedback.service.js";

import {
    createFormSchema,
    updateFormSchema,
    submitFeedbackSchema
} from "./feedback.validator.js";

// Utility to extract client info for anti-abuse
const getClientInfo = (req) => ({
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    deviceFingerprint: req.headers['x-device-fingerprint'] || null
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

export const createForm = async (req, res) => {
    try {
        const validatedData = createFormSchema.parse(req.body);
        const form = await createFeedbackForm(validatedData, req.user);
        res.status(201).json({ success: true, data: form });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateForm = async (req, res) => {
    try {
        const { formId } = req.params;
        const validatedData = updateFormSchema.parse({ ...req.body, id: formId });
        const form = await updateFeedbackForm(formId, validatedData, req.user);
        res.status(200).json({ success: true, data: form });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteForm = async (req, res) => {
    try {
        const { formId } = req.params;
        await deleteFeedbackForm(formId, req.user);
        res.status(200).json({ success: true, message: "Form deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAdminForms = async (req, res) => {
    try {
        const forms = await getFormsForAdmin(req.user);
        res.status(200).json({ success: true, data: forms });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ==========================================
// STUDENT ENDPOINTS
// ==========================================

export const getForms = async (req, res) => {
    try {
        const forms = await getAvailableForms(req.user);
        res.status(200).json({ success: true, data: forms });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getMySubmissions = async (req, res) => {
    try {
        const submissions = await getStudentSubmissions(req.user);
        res.status(200).json({ success: true, data: submissions });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getForm = async (req, res) => {
    try {
        const { formId } = req.params;
        const form = await getFormById(formId, req.user);
        res.status(200).json({ success: true, data: form });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

export const submitForm = async (req, res) => {
    try {
        const validatedData = submitFeedbackSchema.parse({
            ...req.body,
            formId: req.params.formId
        });
        const clientInfo = getClientInfo(req);
        
        const receipt = await submitFeedback(validatedData, req.user, clientInfo);
        
        res.status(201).json({ 
            success: true, 
            message: "Feedback submitted securely",
            data: receipt 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
