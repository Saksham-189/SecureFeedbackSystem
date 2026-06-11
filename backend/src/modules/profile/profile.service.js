import prisma from "../../prisma/prismaClient.js";
import { comparePassword, hashPassword } from "../../utils/hashPassword.js";
import auditLogger from "../../utils/auditLogger.js";

const getRoleName = (user) => user?.role?.name || user?.role;

const permissionMap = {
    SUPER_ADMIN: [
        "Create colleges",
        "Create college administrators",
        "View platform audit activity",
        "Manage platform-level academic structure"
    ],
    ADMIN: [
        "Create faculty accounts",
        "Manage department academic structure",
        "Assign courses and sections",
        "Review institutional analytics"
    ],
    FACULTY: [
        "View assigned campaign analytics",
        "Review privacy-preserving feedback summaries",
        "Access assigned course context"
    ],
    STUDENT: [
        "Submit anonymous feedback",
        "View own submission receipts",
        "Manage own profile identity"
    ]
};

const selectUserProfile = {
    id: true,
    name: true,
    email: true,
    employeeId: true,
    studentIdNumber: true,
    college: { select: { id: true, name: true, domain: true } },
    department: { select: { id: true, name: true, code: true } },
    role: { select: { name: true } },
    createdAt: true,
    lastLogin: true
};

const getOrCreateSemesterByNumber = async (semesterNumber, collegeId, client = prisma) => {
    const number = Number(semesterNumber);
    if (!Number.isInteger(number) || number < 1 || number > 8) {
        throw new Error("Semester must be between 1 and 8");
    }

    const currentYear = await client.academicYear.findFirst({
        where: { collegeId, isCurrent: true }
    });

    const academicYear = currentYear || await client.academicYear.create({
        data: {
            collegeId,
            name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            isCurrent: true
        }
    });

    return client.semester.upsert({
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
};

export const getProfile = async (user) => {
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            ...selectUserProfile,
            sessions: {
                where: { isRevoked: false, expiresAt: { gt: new Date() } },
                select: {
                    id: true,
                    deviceFingerprint: true,
                    ipAddress: true,
                    userAgent: true,
                    createdAt: true,
                    expiresAt: true
                },
                orderBy: { createdAt: "desc" },
                take: 10
            },
            auditLogs: {
                select: { id: true, action: true, severity: true, timestamp: true },
                orderBy: { timestamp: "desc" },
                take: 8
            },
            courseAssignments: {
                include: {
                    course: { include: { department: { select: { name: true, code: true } } } },
                    section: {
                        include: {
                            department: { select: { name: true, code: true } },
                            semester: { select: { id: true, number: true, name: true } }
                        }
                    },
                    semester: { select: { id: true, number: true, name: true } }
                }
            },
            enrollments: {
                include: {
                    section: {
                        include: {
                            department: { select: { name: true, code: true } },
                            semester: { select: { id: true, number: true, name: true } }
                        }
                    },
                    semester: { select: { id: true, number: true, name: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 5
            },
            _count: {
                select: {
                    feedbackSubmissions: { where: { status: "COMPLETED" } },
                    auditLogs: true,
                    sessions: { where: { isRevoked: false, expiresAt: { gt: new Date() } } }
                }
            }
        }
    });

    if (!dbUser) throw new Error("Profile not found");

    const role = dbUser.role.name;
    return {
        user: dbUser,
        role,
        permissions: permissionMap[role] || [],
        auditSummary: {
            totalEvents: dbUser._count.auditLogs,
            recentEvents: dbUser.auditLogs,
            activeSessions: dbUser._count.sessions
        },
        submissionStats: {
            completedSubmissions: dbUser._count.feedbackSubmissions
        }
    };
};

export const updateProfile = async (data, user) => {
    const role = getRoleName(user);
    const updateData = {};

    if (typeof data.name === "string" && data.name.trim()) {
        updateData.name = data.name.trim();
    }

    if (role === "FACULTY" && typeof data.employeeId === "string") {
        updateData.employeeId = data.employeeId.trim() || null;
    }

    if (role === "STUDENT" && typeof data.studentIdNumber === "string") {
        updateData.studentIdNumber = data.studentIdNumber.trim() || null;
    }

    const wantsEnrollmentUpdate = role === "STUDENT" && (
        data.departmentId || data.semesterNumber || data.sectionId
    );

    if (Object.keys(updateData).length === 0 && !wantsEnrollmentUpdate) {
        throw new Error("No profile changes provided");
    }

    const updated = await prisma.$transaction(async (tx) => {
        let resolvedDepartmentId = data.departmentId;
        let resolvedSemester = null;
        let resolvedSection = null;

        if (wantsEnrollmentUpdate) {
            if (!resolvedDepartmentId || !data.semesterNumber || !data.sectionId) {
                throw new Error("Department, semester, and section are required");
            }

            const department = await tx.department.findFirst({
                where: { id: resolvedDepartmentId, collegeId: user.collegeId }
            });
            if (!department) throw new Error("Department not found");

            resolvedSemester = await getOrCreateSemesterByNumber(data.semesterNumber, user.collegeId, tx);
            resolvedSection = await tx.section.findFirst({
                where: {
                    id: data.sectionId,
                    departmentId: resolvedDepartmentId,
                    semesterId: resolvedSemester.id,
                    department: { collegeId: user.collegeId }
                }
            });
            if (!resolvedSection) throw new Error("Section not found for selected department and semester");

            updateData.departmentId = resolvedDepartmentId;
        }

        const dbUser = await tx.user.update({
            where: { id: user.id },
            data: updateData,
            select: selectUserProfile
        });

        if (wantsEnrollmentUpdate) {
            const existing = await tx.enrollment.findFirst({
                where: { studentId: user.id },
                orderBy: { createdAt: "desc" }
            });

            if (existing) {
                await tx.enrollment.update({
                    where: { id: existing.id },
                    data: {
                        collegeId: user.collegeId,
                        sectionId: resolvedSection.id,
                        semesterId: resolvedSemester.id
                    }
                });
            } else {
                await tx.enrollment.create({
                    data: {
                        collegeId: user.collegeId,
                        studentId: user.id,
                        sectionId: resolvedSection.id,
                        semesterId: resolvedSemester.id
                    }
                });
            }
        }

        return dbUser;
    });

    await auditLogger({
        userId: user.id,
        action: "PROFILE_UPDATED",
        resourceType: "PROFILE",
        resourceId: user.id,
        severity: "INFO"
    });

    return updated;
};

export const changePassword = async (data, user) => {
    const { currentPassword, newPassword } = data;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
        throw new Error("Current password and a new password of at least 6 characters are required");
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, passwordHash: true }
    });
    if (!dbUser) throw new Error("User not found");

    const valid = await comparePassword(currentPassword, dbUser.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma.session.updateMany({ where: { userId: user.id, isRevoked: false }, data: { isRevoked: true } })
    ]);

    await auditLogger({
        userId: user.id,
        action: "PASSWORD_CHANGED",
        resourceType: "PROFILE",
        resourceId: user.id,
        severity: "WARNING"
    });

    return { success: true };
};
