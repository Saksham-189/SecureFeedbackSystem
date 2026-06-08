import * as campaignService from './campaign.service.js';

export const createCampaign = async (req, res) => {
    try {
        const data = await campaignService.createCampaign(req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listCampaigns = async (req, res) => {
    try {
        const data = await campaignService.getCampaigns(req.user, req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getCampaignById = async (req, res) => {
    try {
        const data = await campaignService.getCampaignById(req.params.id, req.user);
        if (!data) return res.status(404).json({ success: false, message: 'Campaign not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const changeCampaignStatus = async (req, res) => {
    try {
        const data = await campaignService.updateCampaignStatus(req.params.id, req.body.status, req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getStudentCampaigns = async (req, res) => {
    try {
        const data = await campaignService.getStudentCampaigns(req.user.id, req.user.collegeId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getFacultyCampaigns = async (req, res) => {
    try {
        const data = await campaignService.getFacultyCampaigns(req.user);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
