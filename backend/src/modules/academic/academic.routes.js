import express from 'express';
import authMiddleware from '../../middleware/auth.middleware.js';
import rbacMiddleware from '../../middleware/rbac.middleware.js';
import { ROLES } from '../../constants/roles.js';
import * as academicController from './academic.controller.js';

const router = express.Router();

router.use(authMiddleware);

// Departments
router.get('/departments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listDepartments);
router.post('/departments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addDepartment);

// Programs
router.get('/departments/:deptId/programs', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listPrograms);
router.post('/programs', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addProgram);

// Academic Years
router.get('/academic-years', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listAcademicYears);
router.post('/academic-years', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addAcademicYear);

// Semesters
router.get('/academic-years/:ayId/semesters', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listSemesters);

// Sections
router.get('/sections', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listSections);
router.post('/sections', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addSection);

// Courses
router.get('/courses', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY), academicController.listCourses);
router.post('/courses', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addCourse);

// Course Assignments
router.get('/course-assignments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY), academicController.listCourseAssignments);
router.post('/course-assignments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addCourseAssignment);

// Enrollments
router.get('/enrollments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.listEnrollments);
router.post('/enrollments', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addEnrollment);
router.post('/enrollments/bulk', rbacMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN), academicController.addBulkEnrollments);

export default router;
