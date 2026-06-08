import {
    bulkCreateEnrollments,
    createCourseAssignment,
    createEnrollment,
    getCourseAssignments,
    getEnrollments
} from "../academic/academic.service.js";

const handle = (fn, statusCode = 200) => async (req, res) => {
    try {
        const data = await fn(req);
        res.status(statusCode).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listEnrollments = handle((req) => getEnrollments(req.query, req.user));
export const addEnrollment = handle((req) => createEnrollment(req.body, req.user), 201);
export const addBulkEnrollments = handle((req) => {
    const { studentIds, sectionId, semesterId } = req.body;
    return bulkCreateEnrollments(studentIds, sectionId, semesterId, req.user);
}, 201);

export const listCourseAssignments = handle((req) => getCourseAssignments(req.query, req.user));
export const addCourseAssignment = handle((req) => createCourseAssignment(req.body, req.user), 201);
