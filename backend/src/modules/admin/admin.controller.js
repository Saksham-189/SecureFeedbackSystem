import {
    fetchUsers,
    provisionUser,
    changeUserLockStatus,
    fetchAuditLogs,
    fetchAnomalies,
    fetchSecurityMetrics
} from "./admin.service.js";

export const getUsers = async (req, res) => {
    try {
        const users = await fetchUsers(req.user.collegeId, req.user.role);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const user = await provisionUser(req.body, req.user);
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isLocked } = req.body;
        const updatedUser = await changeUserLockStatus(userId, isLocked, req.user);
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAuditLogs = async (req, res) => {
    try {
        // Simple pagination for now
        const limit = Number(req.query.limit) || 50;
        const logs = await fetchAuditLogs(req.user, limit);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getSystemAnomalies = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const anomalies = await fetchAnomalies(req.user, limit);
        res.status(200).json({ success: true, data: anomalies });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getSecurityMetrics = async (req, res) => {
    try {
        const metrics = await fetchSecurityMetrics(req.user);
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
