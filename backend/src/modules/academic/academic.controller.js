import * as academicService from "./academic.service.js";

const handle = (fn, statusCode = 200) => async (req, res) => {
    try {
        const data = await fn(req);
        res.status(statusCode).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listDepartments = handle((req) => academicService.getDepartments(req.user));
export const addDepartment = handle((req) => academicService.createDepartment(req.body, req.user), 201);

export const listColleges = handle(() => academicService.getColleges());
export const addCollege = handle((req) => academicService.createCollege(req.body, req.user), 201);
export const editCollege = handle((req) => academicService.updateCollege(req.params.collegeId, req.body, req.user));

export const listPrograms = handle((req) => academicService.getPrograms(req.params.deptId, req.user));
export const addProgram = handle((req) => academicService.createProgram(req.body, req.user), 201);

export const listAcademicYears = handle((req) => academicService.getAcademicYears(req.user));
export const addAcademicYear = handle((req) => academicService.createAcademicYear(req.body, req.user), 201);

export const listSemesters = handle((req) => academicService.getSemesters(req.params.ayId, req.user));

export const listSections = handle((req) => academicService.getSections(req.query, req.user));
export const addSection = handle((req) => academicService.createSection(req.body, req.user), 201);

export const listCourses = handle((req) => academicService.getCourses(req.query, req.user));
export const addCourse = handle((req) => academicService.createCourse(req.body, req.user), 201);

export const listCourseAssignments = handle((req) => academicService.getCourseAssignments(req.query, req.user));
export const addCourseAssignment = handle((req) => academicService.createCourseAssignment(req.body, req.user), 201);

export const listEnrollments = handle((req) => academicService.getEnrollments(req.query, req.user));
export const addEnrollment = handle((req) => academicService.createEnrollment(req.body, req.user), 201);

export const addBulkEnrollments = handle((req) => {
    const { studentIds, sectionId, semesterId } = req.body;
    return academicService.bulkCreateEnrollments(studentIds, sectionId, semesterId, req.user);
}, 201);
