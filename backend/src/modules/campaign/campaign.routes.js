import express from 'express';
import authMiddleware from '../../middleware/auth.middleware.js';
import rbacMiddleware from '../../middleware/rbac.middleware.js';
import { ROLES } from '../../constants/roles.js';
import * as campaignController from './campaign.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', rbacMiddleware(ROLES.ADMIN), campaignController.createCampaign);
router.get('/', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), campaignController.listCampaigns);
router.get('/student', rbacMiddleware(ROLES.STUDENT), campaignController.getStudentCampaigns);
router.get('/faculty', rbacMiddleware(ROLES.FACULTY), campaignController.getFacultyCampaigns);
router.get('/:id', rbacMiddleware(ROLES.ADMIN, ROLES.FACULTY, ROLES.SUPER_ADMIN), campaignController.getCampaignById);
router.patch('/:id/status', rbacMiddleware(ROLES.ADMIN), campaignController.changeCampaignStatus);

export default router;
