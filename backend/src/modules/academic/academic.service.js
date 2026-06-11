import prisma from "../../prisma/prismaClient.js";

const getRoleName = (user) => user?.role?.name || user?.role;
const isSuperAdmin = (user) => getRoleName(user) === "SUPER_ADMIN";

const collegeScope = (user) => {
    if (!user?.collegeId && !isSuperAdmin(user)) {
        throw new Error("User is not assigned to a college");
    }

    return user.collegeId;
};

const requireCollegeAdmin = (user) => {
    if (getRoleName(user) !== "ADMIN") {
        throw new Error("Only College Admins can manage academic structures");
    }

    return collegeScope(user);
};

const assertDepartment = async (departmentId, user) => {
    const collegeId = collegeScope(user);
    const department = await prisma.department.findFirst({
        where: {
            id: departmentId,
            ...(isSuperAdmin(user) ? {} : { collegeId })
        }
    });

    if (!department) throw new Error("Department not found");
    return department;
};

const assertAcademicYear = async (academicYearId, user) => {
    const collegeId = collegeScope(user);
    const academicYear = await prisma.academicYear.findFirst({
        where: {
            id: academicYearId,
            ...(isSuperAdmin(user) ? {} : { collegeId })
        }
    });

    if (!academicYear) throw new Error("Academic year not found");
    return academicYear;
};

const assertSemester = async (semesterId, user) => {
    const collegeId = collegeScope(user);
    const semester = await prisma.semester.findFirst({
        where: {
            id: semesterId,
            ...(isSuperAdmin(user) ? {} : { academicYear: { collegeId } })
        },
        include: { academicYear: true }
    });

    if (!semester) throw new Error("Semester not found");
    return semester;
};

const getOrCreateSemesterByNumber = async (semesterNumber, user) => {
    const collegeId = collegeScope(user);
    const number = Number(semesterNumber);
    if (!Number.isInteger(number) || number < 1 || number > 8) {
        throw new Error("Semester must be between 1 and 8");
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { collegeId, isCurrent: true },
        include: { semesters: true }
    });

    const academicYear = currentYear || await prisma.academicYear.create({
        data: {
            collegeId,
            name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            isCurrent: true
        }
    });

    return prisma.semester.upsert({
        where: {
            academicYearId_number: {
                academicYearId: academicYear.id,
                number
            }
        },
        update: { name: `Semester ${number}` },
        create: {
            academicYearId: academicYear.id,
            number,
            name: `Semester ${number}`
        },
        include: { academicYear: true }
    });
};

const assertSection = async (sectionId, user) => {
    const collegeId = collegeScope(user);
    const section = await prisma.section.findFirst({
        where: {
            id: sectionId,
            ...(isSuperAdmin(user) ? {} : { department: { collegeId } })
        },
        include: {
            department: true,
            semester: { include: { academicYear: true } }
        }
    });

    if (!section) throw new Error("Section not found");
    return section;
};

const assertCourse = async (courseId, user) => {
    const collegeId = collegeScope(user);
    const course = await prisma.course.findFirst({
        where: {
            id: courseId,
            ...(isSuperAdmin(user) ? {} : { department: { collegeId } })
        },
        include: { department: true }
    });

    if (!course) throw new Error("Course not found");
    return course;
};

export const getDepartments = async (user) => {
    return prisma.department.findMany({
        where: isSuperAdmin(user) ? {} : { collegeId: collegeScope(user) },
        include: {
            _count: {
                select: { users: true, programs: true, courses: true, sections: true }
            }
        },
        orderBy: [{ code: "asc" }]
    });
};

export const getColleges = async () => {
    return prisma.college.findMany({
        include: {
            _count: { select: { users: true, departments: true, campaigns: true } }
        },
        orderBy: { name: "asc" }
    });
};

export const createCollege = async (data, user) => {
    if (!isSuperAdmin(user)) throw new Error("Only Super Admin can create colleges");

    const name = data.name?.trim();
    const domain = data.domain?.trim().toLowerCase() || null;
    if (!name) throw new Error("College name is required");

    return prisma.college.create({
        data: { name, domain }
    });
};

export const updateCollege = async (collegeId, data, user) => {
    if (!isSuperAdmin(user)) throw new Error("Only Super Admin can edit colleges");

    const existing = await prisma.college.findUnique({ where: { id: collegeId } });
    if (!existing) throw new Error("College not found");

    const updateData = {};
    if (data.name !== undefined) {
        const name = data.name?.trim();
        if (!name) throw new Error("College name is required");
        updateData.name = name;
    }
    if (data.domain !== undefined) {
        updateData.domain = data.domain?.trim().toLowerCase() || null;
    }
    if (data.isActive !== undefined) {
        updateData.isActive = Boolean(data.isActive);
    }

    return prisma.college.update({
        where: { id: collegeId },
        data: updateData
    });
};

export const createDepartment = async (data, user) => {
    const name = data.name?.trim();
    const code = data.code?.trim().toUpperCase();
    if (!name || !code) throw new Error("Department name and code are required");
    const collegeId = requireCollegeAdmin(user);

    return prisma.department.upsert({
        where: {
            collegeId_code: {
                collegeId,
                code
            }
        },
        update: { name },
        create: {
            name,
            code,
            collegeId
        }
    });
};

export const getPrograms = async (departmentId, user) => {
    await assertDepartment(departmentId, user);
    return prisma.program.findMany({
        where: { departmentId },
        orderBy: { name: "asc" }
    });
};

export const createProgram = async (data, user) => {
    requireCollegeAdmin(user);
    await assertDepartment(data.departmentId, user);
    const name = data.name?.trim();
    if (!name) throw new Error("Program name is required");

    return prisma.program.upsert({
        where: {
            departmentId_name: {
                departmentId: data.departmentId,
                name
            }
        },
        update: {},
        create: { name, departmentId: data.departmentId }
    });
};

export const getAcademicYears = async (user) => {
    return prisma.academicYear.findMany({
        where: isSuperAdmin(user) ? {} : { collegeId: collegeScope(user) },
        include: {
            semesters: { orderBy: { number: "asc" } }
        },
        orderBy: { name: "desc" }
    });
};

export const createAcademicYear = async (data, user) => {
    const collegeId = requireCollegeAdmin(user);
    const name = data.name?.trim();
    if (!name) throw new Error("Academic year name is required");

    return prisma.$transaction(async (tx) => {
        if (data.isCurrent) {
            await tx.academicYear.updateMany({
                where: { collegeId, isCurrent: true },
                data: { isCurrent: false }
            });
        }

        const academicYear = await tx.academicYear.upsert({
            where: {
                collegeId_name: {
                    collegeId,
                    name
                }
            },
            update: { isCurrent: !!data.isCurrent },
            create: {
                name,
                collegeId,
                isCurrent: !!data.isCurrent
            }
        });

        const semesterCount = Number(data.semesterCount || 8);
        for (let number = 1; number <= semesterCount; number += 1) {
            await tx.semester.upsert({
                where: {
                    academicYearId_number: {
                        academicYearId: academicYear.id,
                        number
                    }
                },
                update: { name: `Semester ${number}` },
                create: {
                    academicYearId: academicYear.id,
                    number,
                    name: `Semester ${number}`
                }
            });
        }

        return academicYear;
    });
};

export const getSemesters = async (academicYearId, user) => {
    await assertAcademicYear(academicYearId, user);
    return prisma.semester.findMany({
        where: { academicYearId },
        orderBy: { number: "asc" }
    });
};

export const getSections = async ({ departmentId, semesterId } = {}, user) => {
    if (departmentId) await assertDepartment(departmentId, user);
    if (semesterId) await assertSemester(semesterId, user);

    return prisma.section.findMany({
        where: {
            ...(departmentId ? { departmentId } : {}),
            ...(semesterId ? { semesterId } : {}),
            ...(isSuperAdmin(user) ? {} : { department: { collegeId: collegeScope(user) } })
        },
        include: {
            department: { select: { id: true, name: true, code: true } },
            semester: { select: { id: true, number: true, name: true } },
            _count: { select: { enrollments: true, courseAssignments: true } }
        },
        orderBy: [{ department: { code: "asc" } }, { name: "asc" }]
    });
};

export const createSection = async (data, user) => {
    requireCollegeAdmin(user);
    const department = await assertDepartment(data.departmentId, user);
    const semester = data.semesterId
        ? await assertSemester(data.semesterId, user)
        : await getOrCreateSemesterByNumber(data.semesterNumber, user);
    if (department.collegeId !== semester.academicYear.collegeId) {
        throw new Error("Department and semester must belong to the same college");
    }

    const name = data.name?.trim().toUpperCase();
    if (!name) throw new Error("Section name is required");

    return prisma.section.upsert({
        where: {
            departmentId_semesterId_name: {
                departmentId: data.departmentId,
                semesterId: semester.id,
                name
            }
        },
        update: {},
        create: { name, departmentId: data.departmentId, semesterId: semester.id }
    });
};

export const getCourses = async ({ departmentId } = {}, user) => {
    if (departmentId) await assertDepartment(departmentId, user);

    return prisma.course.findMany({
        where: {
            ...(departmentId ? { departmentId } : {}),
            ...(isSuperAdmin(user) ? {} : { department: { collegeId: collegeScope(user) } })
        },
        include: {
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { assignments: true } }
        },
        orderBy: [{ department: { code: "asc" } }, { code: "asc" }]
    });
};

export const createCourse = async (data, user) => {
    requireCollegeAdmin(user);
    await assertDepartment(data.departmentId, user);
    const name = data.name?.trim();
    const code = data.code?.trim().toUpperCase();
    if (!name || !code) throw new Error("Course name and code are required");

    return prisma.course.upsert({
        where: {
            departmentId_code: {
                departmentId: data.departmentId,
                code
            }
        },
        update: { name, credits: Number(data.credits || 3) },
        create: {
            name,
            code,
            credits: Number(data.credits || 3),
            departmentId: data.departmentId
        }
    });
};

export const getCourseAssignments = async ({ semesterId, sectionId, facultyId } = {}, user) => {
    if (semesterId) await assertSemester(semesterId, user);
    if (sectionId) await assertSection(sectionId, user);

    const where = {
        ...(semesterId ? { semesterId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(facultyId ? { facultyId } : {}),
        ...(getRoleName(user) === "FACULTY" ? { facultyId: user.id } : {}),
        ...(isSuperAdmin(user) ? {} : { course: { department: { collegeId: collegeScope(user) } } })
    };

    return prisma.courseAssignment.findMany({
        where,
        include: {
            course: { include: { department: { select: { name: true, code: true } } } },
            faculty: { select: { id: true, name: true, email: true } },
            section: {
                include: {
                    department: { select: { name: true, code: true } },
                    semester: { select: { number: true, name: true } }
                }
            },
            semester: { select: { id: true, number: true, name: true } },
            _count: { select: { campaigns: true } }
        },
        orderBy: [{ course: { code: "asc" } }]
    });
};

export const createCourseAssignment = async (data, user) => {
    requireCollegeAdmin(user);
    const course = await assertCourse(data.courseId, user);
    const section = await assertSection(data.sectionId, user);
    const semester = await assertSemester(data.semesterId, user);

    if (course.department.collegeId !== section.department.collegeId || course.department.collegeId !== semester.academicYear.collegeId) {
        throw new Error("Course, section, and semester must belong to the same college");
    }
    if (section.semesterId !== data.semesterId) {
        throw new Error("Section is not part of the selected semester");
    }

    const faculty = await prisma.user.findFirst({
        where: {
            id: data.facultyId,
            collegeId: course.department.collegeId,
            role: { name: "FACULTY" }
        }
    });
    if (!faculty) throw new Error("Faculty user not found");

    const assignmentKey = {
        courseId: data.courseId,
        facultyId: data.facultyId,
        sectionId: data.sectionId,
        semesterId: data.semesterId
    };

    return prisma.courseAssignment.upsert({
        where: { courseId_facultyId_sectionId_semesterId: assignmentKey },
        update: {},
        create: {
            ...assignmentKey,
            collegeId: course.department.collegeId
        }
    });
};

export const getEnrollments = async ({ sectionId, semesterId, studentId } = {}, user) => {
    if (sectionId) await assertSection(sectionId, user);
    if (semesterId) await assertSemester(semesterId, user);

    return prisma.enrollment.findMany({
        where: {
            ...(sectionId ? { sectionId } : {}),
            ...(semesterId ? { semesterId } : {}),
            ...(studentId ? { studentId } : {}),
            ...(isSuperAdmin(user) ? {} : { section: { department: { collegeId: collegeScope(user) } } })
        },
        include: {
            student: { select: { id: true, name: true, email: true, departmentId: true } },
            section: {
                include: {
                    department: { select: { name: true, code: true } },
                    semester: { select: { number: true, name: true } }
                }
            },
            semester: { select: { id: true, number: true, name: true } }
        },
        orderBy: [{ student: { name: "asc" } }]
    });
};

export const createEnrollment = async (data, user) => {
    requireCollegeAdmin(user);
    const section = await assertSection(data.sectionId, user);
    const semester = await assertSemester(data.semesterId, user);
    if (section.semesterId !== semester.id) {
        throw new Error("Section is not part of the selected semester");
    }

    const student = await prisma.user.findFirst({
        where: {
            id: data.studentId,
            collegeId: section.department.collegeId,
            role: { name: "STUDENT" }
        }
    });
    if (!student) throw new Error("Student user not found");

    const enrollmentKey = {
        studentId: data.studentId,
        sectionId: data.sectionId,
        semesterId: data.semesterId
    };

    return prisma.enrollment.upsert({
        where: { studentId_sectionId_semesterId: enrollmentKey },
        update: {},
        create: {
            ...enrollmentKey,
            collegeId: section.department.collegeId
        }
    });
};

export const bulkCreateEnrollments = async (studentIds, sectionId, semesterId, user) => {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("At least one student is required");
    }

    const created = [];
    for (const studentId of studentIds) {
        created.push(await createEnrollment({ studentId, sectionId, semesterId }, user));
    }

    return { count: created.length, enrollments: created };
};
