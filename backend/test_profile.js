import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

async function run() {
    const user = await prisma.user.findFirst({ where: { role: { name: "ADMIN" } } });
    if (!user) { console.log("No admin"); return; }
    
    try {
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
        console.log("SUCCESS!", !!dbUser);
    } catch (e) {
        console.log("FAILED!", e.message);
    }
}
run();
