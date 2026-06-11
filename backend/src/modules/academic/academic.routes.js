import express from 'express';
import authMiddleware from '../../middleware/auth.middleware.js';
import rbacMiddleware from '../../middleware/rbac.middleware.js';
import { ROLES } from '../../constants/roles.js';
import * as academicController from './academic.controller.js';

const router = express.Router();

router.use(authMiddleware);

// Colleges
router.get('/colleges', rbacMiddleware(ROLES.SUPER_ADMIN), academicController.listColleges);
router.post('/colleges', rbacMiddleware(ROLES.SUPER_ADMIN), academicController.addCollege);
router.patch('/colleges/:collegeId', rbacMiddleware(ROLES.SUPER_ADMIN), academicController.editCollege);

// Departments
router.get('/departments', rbacMiddleware(ROLES.ADMIN), academicController.listDepartments);
router.post('/departments', rbacMiddleware(ROLES.ADMIN), academicController.addDepartment);

// Programs
router.get('/departments/:deptId/programs', rbacMiddleware(ROLES.ADMIN), academicController.listPrograms);
router.post('/programs', rbacMiddleware(ROLES.ADMIN), academicController.addProgram);

// Academic Years
router.get('/academic-years', rbacMiddleware(ROLES.ADMIN), academicController.listAcademicYears);
router.post('/academic-years', rbacMiddleware(ROLES.ADMIN), academicController.addAcademicYear);

// Semesters
router.get('/academic-years/:ayId/semesters', rbacMiddleware(ROLES.ADMIN), academicController.listSemesters);

// Sections
router.get('/sections', rbacMiddleware(ROLES.ADMIN), academicController.listSections);
router.post('/sections', rbacMiddleware(ROLES.ADMIN), academicController.addSection);

// Courses
router.get('/courses', rbacMiddleware(ROLES.ADMIN, ROLES.FACULTY), academicController.listCourses);
router.post('/courses', rbacMiddleware(ROLES.ADMIN), academicController.addCourse);

// Course Assignments
router.get('/course-assignments', rbacMiddleware(ROLES.ADMIN, ROLES.FACULTY), academicController.listCourseAssignments);
router.post('/course-assignments', rbacMiddleware(ROLES.ADMIN), academicController.addCourseAssignment);

// Enrollments
router.get('/enrollments', rbacMiddleware(ROLES.ADMIN), academicController.listEnrollments);
router.post('/enrollments', rbacMiddleware(ROLES.ADMIN), academicController.addEnrollment);
router.post('/enrollments/bulk', rbacMiddleware(ROLES.ADMIN), academicController.addBulkEnrollments);

export default router;
