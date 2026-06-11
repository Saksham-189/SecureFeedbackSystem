import prisma from "../../prisma/prismaClient.js";
import auditLogger from "../../utils/auditLogger.js";
import { hashPassword } from "../../utils/hashPassword.js";

/**
 * Fetch all users within the admin's college.
 * Excludes super-admins to prevent horizontal privilege escalation or viewing.
 */
export const fetchUsers = async (collegeId, requestingUserRole) => {
    const where = requestingUserRole === "SUPER_ADMIN"
        ? { role: { name: "ADMIN" } }
        : { collegeId, role: { name: { in: ["FACULTY", "STUDENT"] } } };

    if (requestingUserRole !== "SUPER_ADMIN" && !collegeId) {
        throw new Error("College Admin is not assigned to a college");
    }

    return await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            name: true,
            isLocked: true,
            failedLoginAttempts: true,
            lastLogin: true,
            createdAt: true,
            role: {
                select: { name: true }
            },
            college: { select: { id: true, name: true } },
            department: { select: { id: true, name: true, code: true } },
            enrollments: {
                select: {
                    section: {
                        select: {
                            id: true,
                            name: true,
                            semester: { select: { id: true, number: true, name: true } }
                        }
                    },
                    semester: { select: { id: true, number: true, name: true } }
                },
                take: 1,
                orderBy: { createdAt: "desc" }
            },
            employeeId: true,
            studentIdNumber: true,
            designation: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Provision a new user.
 * Attack Model Mitigation:
 * - Admin cannot provision SUPER_ADMIN.
 * - Password is automatically hashed before DB storage.
 */
const getOrCreateSemesterByNumber = async (semesterNumber, collegeId) => {
    const number = Number(semesterNumber);
    if (!Number.isInteger(number) || number < 1 || number > 8) {
        throw new Error("Semester must be between 1 and 8");
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { collegeId, isCurrent: true }
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
        }
    });
};

export const provisionUser = async (data, adminUser) => {
    const {
        email,
        name,
        password,
        roleName,
        collegeId,
        departmentId,
        employeeId,
        studentIdNumber,
        designation,
        sectionId,
        semesterId,
        semesterNumber
    } = data;
    const adminRole = adminUser.role;

    // Fetch the role ID
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error("Invalid role specified");

    if (roleName === "SUPER_ADMIN") {
        throw new Error("SUPER_ADMIN accounts cannot be provisioned from this screen");
    }

    if (adminRole === "SUPER_ADMIN" && roleName !== "ADMIN") {
        throw new Error("Super Admin provisions college admin accounts only");
    }

    if (adminRole === "ADMIN" && !["FACULTY", "STUDENT"].includes(roleName)) {
        throw new Error("College Admin can provision faculty and student accounts only");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("Email already registered");

    const targetCollegeId = adminRole === "SUPER_ADMIN" ? collegeId : adminUser.collegeId;
    if (!targetCollegeId) throw new Error("College is required");

    const college = await prisma.college.findUnique({ where: { id: targetCollegeId } });
    if (!college) throw new Error("College not found");
    if (!college.isActive) throw new Error("College is disabled");

    if (adminRole === "SUPER_ADMIN" && departmentId) {
        throw new Error("College Admin accounts cannot be assigned to a department");
    }

    if (adminRole === "ADMIN" && roleName === "FACULTY" && !departmentId) {
        throw new Error("Department is required for faculty");
    }

    if (adminRole === "ADMIN" && roleName === "STUDENT" && (!departmentId || !sectionId || !semesterNumber)) {
        throw new Error("Department, semester, and section are required for students");
    }

    if (departmentId) {
        const department = await prisma.department.findFirst({
            where: { id: departmentId, collegeId: targetCollegeId }
        });
        if (!department) throw new Error("Department not found for selected college");
    }

    let resolvedSemester = null;
    let resolvedSection = null;

    if (roleName === "STUDENT") {
        resolvedSemester = semesterId
            ? await prisma.semester.findFirst({
                where: { id: semesterId, academicYear: { collegeId: targetCollegeId } }
            })
            : await getOrCreateSemesterByNumber(semesterNumber, targetCollegeId);

        if (!resolvedSemester) throw new Error("Semester not found");

        resolvedSection = await prisma.section.findFirst({
            where: {
                id: sectionId,
                departmentId,
                semesterId: resolvedSemester.id,
                department: { collegeId: targetCollegeId }
            }
        });
        if (!resolvedSection) throw new Error("Section not found for selected department and semester");
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword,
                roleId: role.id,
                collegeId: targetCollegeId,
                departmentId: departmentId || null,
                employeeId: roleName === "FACULTY" ? (employeeId || null) : null,
                studentIdNumber: roleName === "STUDENT" ? (studentIdNumber || null) : null,
                designation: roleName === "FACULTY" ? (designation || null) : null
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: { select: { name: true } },
                college: { select: { id: true, name: true } },
                department: { select: { id: true, name: true, code: true } },
                employeeId: true,
                studentIdNumber: true,
                designation: true
            }
        });

        if (roleName === "STUDENT") {
            await tx.enrollment.create({
                data: {
                    collegeId: targetCollegeId,
                    studentId: created.id,
                    sectionId: resolvedSection.id,
                    semesterId: resolvedSemester.id
                }
            });
        }

        return created;
    });

    await auditLogger({
        userId: adminUser.id,
        action: "USER_PROVISIONED",
        resourceType: "AUTH",
        resourceId: newUser.id,
        severity: "WARNING", // Provisioning is a sensitive action
        details: { provisionedRole: roleName }
    });

    return newUser;
};

/**
 * Lock or Unlock a user account.
 * Mitigates insider threat by logging exact action.
 */
export const changeUserLockStatus = async (targetUserId, isLocked, adminUser) => {
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { role: true }
    });

    if (!targetUser) throw new Error("User not found");
    const adminRole = adminUser.role;
    if (adminRole === "SUPER_ADMIN") {
        if (targetUser.role.name !== "ADMIN") throw new Error("Super Admin can only manage College Admin accounts");
    } else if (targetUser.collegeId !== adminUser.collegeId) {
        throw new Error("Unauthorized");
    }

    // Prevent locking yourself or superior admins
    if (targetUser.id === adminUser.id) throw new Error("Cannot modify your own lock status");
    if (targetUser.role.name === "SUPER_ADMIN") throw new Error("Cannot lock a SUPER_ADMIN");

    const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { 
            isLocked,
            failedLoginAttempts: isLocked ? targetUser.failedLoginAttempts : 0 // Reset on unlock
        },
        select: { id: true, email: true, isLocked: true }
    });

    // If locked by admin, revoke all sessions immediately to kick them out
    if (isLocked) {
        await prisma.session.updateMany({
            where: { userId: targetUserId, isRevoked: false },
            data: { isRevoked: true }
        });
    }

    await auditLogger({
        userId: adminUser.id,
        action: isLocked ? "USER_LOCKED_BY_ADMIN" : "USER_UNLOCKED_BY_ADMIN",
        resourceType: "AUTH",
        resourceId: targetUserId,
        severity: "CRITICAL"
    });

    return updatedUser;
};

/**
 * Fetch Audit Logs for the SOC Dashboard.
 * Strict college-level scoping.
 */
export const fetchAuditLogs = async (user, limit = 50) => {
    return await prisma.auditLog.findMany({
        where: user.role === "SUPER_ADMIN" ? {} : { collegeId: user.collegeId },
        include: {
            user: {
                select: { email: true, name: true, role: { select: { name: true } } }
            },
            college: { select: { id: true, name: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
    });
};

/**
 * Fetch System Anomalies (Threat detection).
 * Used for SIEM monitoring by admins.
 */
export const fetchAnomalies = async (user, limit = 20) => {
    return await prisma.abuseAnomaly.findMany({
        where: user.role === "SUPER_ADMIN" ? {} : { form: { collegeId: user.collegeId } },
        include: {
            form: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    });
};

/**
 * Fetch real-time security intelligence metrics for the SOC Dashboard.
 */
export const fetchSecurityMetrics = async (user) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const baseWhere = user.role === "SUPER_ADMIN" ? {} : { collegeId: user.collegeId };
    const userWhere = user.role === "SUPER_ADMIN" ? {} : { collegeId: user.collegeId };

    const [
        failedLogins,
        lockedAccounts,
        totalEvents,
        criticalEvents,
        highEvents,
        recentThreats
    ] = await Promise.all([
        prisma.auditLog.count({
            where: { ...baseWhere, action: 'LOGIN_FAILED', timestamp: { gte: twentyFourHoursAgo } }
        }),
        prisma.user.count({
            where: { ...userWhere, isLocked: true }
        }),
        prisma.auditLog.count({
            where: { ...baseWhere, timestamp: { gte: twentyFourHoursAgo } }
        }),
        prisma.auditLog.count({
            where: { ...baseWhere, severity: 'CRITICAL', timestamp: { gte: twentyFourHoursAgo } }
        }),
        prisma.auditLog.count({
            where: { ...baseWhere, severity: 'WARNING', timestamp: { gte: twentyFourHoursAgo } }
        }),
        prisma.auditLog.findMany({
            where: { ...baseWhere, severity: { in: ['CRITICAL', 'WARNING'] }, timestamp: { gte: twentyFourHoursAgo } },
            orderBy: { timestamp: 'desc' },
            take: 5,
            include: { user: { select: { email: true } } }
        })
    ]);

    // Calculate a basic risk score out of 100
    // Higher means more risk
    let riskScore = 0;
    riskScore += criticalEvents * 10;
    riskScore += highEvents * 5;
    riskScore += failedLogins * 2;
    riskScore += lockedAccounts * 15;
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    return {
        failedLogins,
        lockedAccounts,
        totalEvents,
        criticalEvents,
        highEvents,
        riskScore,
        recentThreats
    };
};
