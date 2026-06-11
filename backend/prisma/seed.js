import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Password@123';
const PLATFORM_SUPER_ADMIN_EMAIL = 'superadmin@securefeedback.local';
const LEGACY_RVCE_SUPER_ADMIN_EMAIL = 'superadmin@rvce.edu.in';

async function upsertUser({ email, name, roleId, collegeId, departmentId, passwordHash }) {
    return prisma.user.upsert({
        where: { email },
        update: {
            name,
            roleId,
            collegeId,
            departmentId: departmentId || null
        },
        create: {
            email,
            name,
            passwordHash,
            roleId,
            collegeId,
            departmentId: departmentId || null
        }
    });
}

async function main() {
    console.log('Seeding V2 Institution Experience & Governance Platform...');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const roleNames = ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'];
    const roles = {};
    for (const name of roleNames) {
        const role = await prisma.role.upsert({
            where: { name },
            update: { description: `${name} role` },
            create: { name, description: `${name} role` }
        });
        roles[name] = role.id;
    }

    const college = await prisma.college.upsert({
        where: { domain: 'rvce.edu.in' },
        update: { name: 'RV College of Engineering' },
        create: { name: 'RV College of Engineering', domain: 'rvce.edu.in' }
    });

    const additionalCollegeData = [
        { name: 'Dayananda Sagar College of Engineering', domain: 'dsce.edu.in' },
        { name: 'Bangalore College of Engineering', domain: 'bce.edu.in' }
    ];

    const additionalColleges = [];
    for (const collegeData of additionalCollegeData) {
        additionalColleges.push(await prisma.college.upsert({
            where: { domain: collegeData.domain },
            update: { name: collegeData.name },
            create: collegeData
        }));
    }

    const deptData = [
        { name: 'Computer Science & Engineering', code: 'CSE' },
        { name: 'Electronics & Communication Engineering', code: 'ECE' },
        { name: 'Mechanical Engineering', code: 'ME' }
    ];

    const departments = {};
    for (const dept of deptData) {
        departments[dept.code] = await prisma.department.upsert({
            where: { collegeId_code: { collegeId: college.id, code: dept.code } },
            update: { name: dept.name },
            create: { ...dept, collegeId: college.id }
        });
    }

    for (const tenantCollege of additionalColleges) {
        const tenantDepartments = {};
        for (const dept of deptData) {
            tenantDepartments[dept.code] = await prisma.department.upsert({
                where: { collegeId_code: { collegeId: tenantCollege.id, code: dept.code } },
                update: { name: dept.name },
                create: { ...dept, collegeId: tenantCollege.id }
            });
        }

        for (const deptCode of Object.keys(tenantDepartments)) {
            for (const programName of ['B.Tech', 'M.Tech']) {
                await prisma.program.upsert({
                    where: {
                        departmentId_name: {
                            departmentId: tenantDepartments[deptCode].id,
                            name: programName
                        }
                    },
                    update: {},
                    create: {
                        name: programName,
                        departmentId: tenantDepartments[deptCode].id
                    }
                });
            }
        }

        await prisma.academicYear.upsert({
            where: { collegeId_name: { collegeId: tenantCollege.id, name: '2025-2026' } },
            update: { isCurrent: true },
            create: { name: '2025-2026', collegeId: tenantCollege.id, isCurrent: true }
        });
    }

    for (const deptCode of Object.keys(departments)) {
        for (const programName of ['B.Tech', 'M.Tech']) {
            await prisma.program.upsert({
                where: {
                    departmentId_name: {
                        departmentId: departments[deptCode].id,
                        name: programName
                    }
                },
                update: {},
                create: {
                    name: programName,
                    departmentId: departments[deptCode].id
                }
            });
        }
    }

    const academicYear = await prisma.academicYear.upsert({
        where: { collegeId_name: { collegeId: college.id, name: '2025-2026' } },
        update: { isCurrent: true },
        create: { name: '2025-2026', collegeId: college.id, isCurrent: true }
    });

    const semesters = {};
    for (let number = 1; number <= 8; number += 1) {
        semesters[number] = await prisma.semester.upsert({
            where: {
                academicYearId_number: {
                    academicYearId: academicYear.id,
                    number
                }
            },
            update: { name: `Semester ${number}` },
            create: {
                number,
                name: `Semester ${number}`,
                academicYearId: academicYear.id
            }
        });
    }

    const sections = {};
    const sectionSpecs = [
        ...['A', 'B', 'C'].flatMap(name => [3, 5].map(semNum => ({ deptCode: 'CSE', name, semNum }))),
        ...['A', 'B'].map(name => ({ deptCode: 'ECE', name, semNum: 5 })),
        { deptCode: 'ME', name: 'A', semNum: 5 }
    ];

    for (const spec of sectionSpecs) {
        const key = `${spec.deptCode}-${spec.name}-S${spec.semNum}`;
        sections[key] = await prisma.section.upsert({
            where: {
                departmentId_semesterId_name: {
                    departmentId: departments[spec.deptCode].id,
                    semesterId: semesters[spec.semNum].id,
                    name: spec.name
                }
            },
            update: {},
            create: {
                name: spec.name,
                departmentId: departments[spec.deptCode].id,
                semesterId: semesters[spec.semNum].id
            }
        });
    }

    const courseData = [
        { name: 'Operating Systems', code: 'CS501', departmentId: departments.CSE.id, credits: 4 },
        { name: 'Database Management Systems', code: 'CS502', departmentId: departments.CSE.id, credits: 4 },
        { name: 'Computer Networks', code: 'CS503', departmentId: departments.CSE.id, credits: 3 },
        { name: 'Data Structures', code: 'CS301', departmentId: departments.CSE.id, credits: 4 },
        { name: 'Algorithms', code: 'CS302', departmentId: departments.CSE.id, credits: 3 },
        { name: 'Digital Signal Processing', code: 'EC501', departmentId: departments.ECE.id, credits: 4 },
        { name: 'VLSI Design', code: 'EC502', departmentId: departments.ECE.id, credits: 3 },
        { name: 'Thermodynamics', code: 'ME501', departmentId: departments.ME.id, credits: 4 }
    ];

    const courses = {};
    for (const course of courseData) {
        courses[course.code] = await prisma.course.upsert({
            where: {
                departmentId_code: {
                    departmentId: course.departmentId,
                    code: course.code
                }
            },
            update: { name: course.name, credits: course.credits },
            create: course
        });
    }

    const legacySuperAdmin = await prisma.user.findUnique({
        where: { email: LEGACY_RVCE_SUPER_ADMIN_EMAIL }
    });
    const platformSuperAdmin = await prisma.user.findUnique({
        where: { email: PLATFORM_SUPER_ADMIN_EMAIL }
    });

    if (legacySuperAdmin && !platformSuperAdmin) {
        await prisma.user.update({
            where: { email: LEGACY_RVCE_SUPER_ADMIN_EMAIL },
            data: {
                email: PLATFORM_SUPER_ADMIN_EMAIL,
                name: 'Super Admin',
                passwordHash,
                roleId: roles.SUPER_ADMIN,
                collegeId: null,
                departmentId: null
            }
        });
    } else if (legacySuperAdmin) {
        await prisma.user.update({
            where: { email: LEGACY_RVCE_SUPER_ADMIN_EMAIL },
            data: {
                email: 'legacy-superadmin@securefeedback.local',
                name: 'Legacy Super Admin',
                collegeId: null,
                departmentId: null
            }
        });
    }

    const superAdmin = await upsertUser({
        email: PLATFORM_SUPER_ADMIN_EMAIL,
        name: 'Super Admin',
        passwordHash,
        roleId: roles.SUPER_ADMIN,
        collegeId: null
    });

    const admin = await upsertUser({
        email: 'admin@rvce.edu.in',
        name: 'College Admin',
        passwordHash,
        roleId: roles.ADMIN,
        collegeId: college.id
    });

    const facultySpecs = [
        { name: 'Dr. Arun Sharma', email: 'arun.sharma@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Dr. Priya Nair', email: 'priya.nair@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Prof. Rajeev Kumar', email: 'rajeev.kumar@rvce.edu.in', deptCode: 'ECE' },
        { name: 'Dr. Meera Iyer', email: 'meera.iyer@rvce.edu.in', deptCode: 'ME' }
    ];

    const faculty = {};
    for (const spec of facultySpecs) {
        faculty[spec.email] = await upsertUser({
            email: spec.email,
            name: spec.name,
            passwordHash,
            roleId: roles.FACULTY,
            collegeId: college.id,
            departmentId: departments[spec.deptCode].id
        });
    }

    const studentSpecs = [
        { name: 'Aarav Patel', email: 'aarav@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Diya Reddy', email: 'diya@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Kavya Singh', email: 'kavya@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Rohit Verma', email: 'rohit@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Sneha Gupta', email: 'sneha@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Vikram Joshi', email: 'vikram@rvce.edu.in', deptCode: 'CSE' },
        { name: 'Ananya Rao', email: 'ananya@rvce.edu.in', deptCode: 'ECE' },
        { name: 'Nikhil Das', email: 'nikhil@rvce.edu.in', deptCode: 'ECE' },
        { name: 'Ishaan Menon', email: 'ishaan@rvce.edu.in', deptCode: 'ME' }
    ];

    const students = {};
    for (const spec of studentSpecs) {
        students[spec.email] = await upsertUser({
            email: spec.email,
            name: spec.name,
            passwordHash,
            roleId: roles.STUDENT,
            collegeId: college.id,
            departmentId: departments[spec.deptCode].id
        });
    }

    const assignmentSpecs = [
        { courseCode: 'CS501', facultyEmail: 'arun.sharma@rvce.edu.in', sectionKey: 'CSE-A-S5', semNum: 5 },
        { courseCode: 'CS502', facultyEmail: 'arun.sharma@rvce.edu.in', sectionKey: 'CSE-B-S5', semNum: 5 },
        { courseCode: 'CS503', facultyEmail: 'priya.nair@rvce.edu.in', sectionKey: 'CSE-A-S5', semNum: 5 },
        { courseCode: 'CS503', facultyEmail: 'priya.nair@rvce.edu.in', sectionKey: 'CSE-C-S5', semNum: 5 },
        { courseCode: 'CS301', facultyEmail: 'priya.nair@rvce.edu.in', sectionKey: 'CSE-A-S3', semNum: 3 },
        { courseCode: 'EC501', facultyEmail: 'rajeev.kumar@rvce.edu.in', sectionKey: 'ECE-A-S5', semNum: 5 },
        { courseCode: 'ME501', facultyEmail: 'meera.iyer@rvce.edu.in', sectionKey: 'ME-A-S5', semNum: 5 }
    ];

    const courseAssignments = {};
    for (const spec of assignmentSpecs) {
        const assignmentKey = {
            courseId: courses[spec.courseCode].id,
            facultyId: faculty[spec.facultyEmail].id,
            sectionId: sections[spec.sectionKey].id,
            semesterId: semesters[spec.semNum].id
        };

        courseAssignments[`${spec.courseCode}-${spec.sectionKey}`] = await prisma.courseAssignment.upsert({
            where: { courseId_facultyId_sectionId_semesterId: assignmentKey },
            update: {},
            create: { ...assignmentKey, collegeId: college.id }
        });
    }

    const enrollmentSpecs = [
        { studentEmail: 'aarav@rvce.edu.in', sectionKey: 'CSE-A-S5', semNum: 5 },
        { studentEmail: 'diya@rvce.edu.in', sectionKey: 'CSE-A-S5', semNum: 5 },
        { studentEmail: 'kavya@rvce.edu.in', sectionKey: 'CSE-A-S5', semNum: 5 },
        { studentEmail: 'rohit@rvce.edu.in', sectionKey: 'CSE-B-S5', semNum: 5 },
        { studentEmail: 'sneha@rvce.edu.in', sectionKey: 'CSE-B-S5', semNum: 5 },
        { studentEmail: 'vikram@rvce.edu.in', sectionKey: 'CSE-C-S5', semNum: 5 },
        { studentEmail: 'ananya@rvce.edu.in', sectionKey: 'ECE-A-S5', semNum: 5 },
        { studentEmail: 'nikhil@rvce.edu.in', sectionKey: 'ECE-A-S5', semNum: 5 },
        { studentEmail: 'ishaan@rvce.edu.in', sectionKey: 'ME-A-S5', semNum: 5 }
    ];

    for (const spec of enrollmentSpecs) {
        const enrollmentKey = {
            studentId: students[spec.studentEmail].id,
            sectionId: sections[spec.sectionKey].id,
            semesterId: semesters[spec.semNum].id
        };

        await prisma.enrollment.upsert({
            where: { studentId_sectionId_semesterId: enrollmentKey },
            update: {},
            create: { ...enrollmentKey, collegeId: college.id }
        });
    }

    const campaignTitle = 'Faculty Evaluation - Semester 5 CSE';
    const formTitle = 'Evaluate Dr. Arun Sharma - Operating Systems';
    let campaign = await prisma.campaign.findFirst({
        where: { collegeId: college.id, title: campaignTitle }
    });

    const campaignData = {
        title: campaignTitle,
        description: 'Course-specific faculty evaluation for CS501 in CSE Semester 5 Section A.',
        type: 'FACULTY_EVAL',
        collegeId: college.id,
        createdById: admin.id,
        targetDepartmentId: departments.CSE.id,
        targetSemesterId: semesters[5].id,
        targetSectionId: sections['CSE-A-S5'].id,
        targetCourseAssignmentId: courseAssignments['CS501-CSE-A-S5'].id,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    if (campaign) {
        campaign = await prisma.campaign.update({
            where: { id: campaign.id },
            data: campaignData
        });
    } else {
        campaign = await prisma.campaign.create({ data: campaignData });
    }

    const questionData = [
        { orderIndex: 0, questionText: 'How would you rate the overall teaching quality?', questionType: 'RATING', isRequired: true },
        { orderIndex: 1, questionText: 'Was the course content well-organized?', questionType: 'RATING', isRequired: true },
        { orderIndex: 2, questionText: 'How clear were the explanations of complex topics?', questionType: 'MCQ', isRequired: true, options: ['Very Clear', 'Somewhat Clear', 'Neutral', 'Unclear', 'Very Unclear'] },
        { orderIndex: 3, questionText: 'Which teaching methods were most effective?', questionType: 'CHECKBOX', isRequired: false, options: ['Lectures', 'Lab Sessions', 'Assignments', 'Group Discussions', 'Presentations'] },
        { orderIndex: 4, questionText: 'What improvements would you suggest?', questionType: 'TEXT', isRequired: false }
    ];

    const formData = {
        title: formTitle,
        description: 'Anonymous evaluation of teaching quality for CS501.',
        collegeId: college.id,
        campaignId: campaign.id,
        status: 'PUBLISHED',
        scheduledFor: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    const existingForm = await prisma.feedbackForm.findFirst({
        where: { campaignId: campaign.id, title: formTitle }
    });

    if (existingForm) {
        const existingSubmissionCount = await prisma.feedbackSubmission.count({
            where: { formId: existingForm.id }
        });

        if (existingSubmissionCount > 0) {
            await prisma.feedbackForm.update({
                where: { id: existingForm.id },
                data: formData
            });
        } else {
            await prisma.feedbackForm.update({
                where: { id: existingForm.id },
                data: {
                    ...formData,
                    questions: {
                        deleteMany: {},
                        create: questionData
                    }
                }
            });
        }
    } else {
        await prisma.feedbackForm.create({
            data: {
                ...formData,
                questions: { create: questionData }
            }
        });
    }

    console.log('Seed complete.');
    console.log(`Roles: ${roleNames.length}`);
    console.log(`College: ${college.name}`);
    console.log(`Departments: ${deptData.length}`);
    console.log(`Courses: ${courseData.length}`);
    console.log(`Sections: ${sectionSpecs.length}`);
    console.log(`Semesters: ${Object.keys(semesters).length}`);
    console.log(`Faculty: ${facultySpecs.length}`);
    console.log(`Students: ${studentSpecs.length}`);
    console.log(`Course Assignments: ${assignmentSpecs.length}`);
    console.log(`Enrollments: ${enrollmentSpecs.length}`);
    console.log('Login credentials, all passwords: Password@123');
    console.log(`Super Admin: ${superAdmin.email}`);
    console.log(`Admin: ${admin.email}`);
    console.log('Faculty: arun.sharma@rvce.edu.in');
    console.log('Student: aarav@rvce.edu.in');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
