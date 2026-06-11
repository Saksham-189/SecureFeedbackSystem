import prisma from "../prisma/prismaClient.js";

const auditLogger = async ({
    userId = null,
    collegeId = undefined,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    severity = "INFO",
    details = null
}) => {

    try {
        let scopedCollegeId = collegeId ?? null;
        if (scopedCollegeId === undefined || scopedCollegeId === null) {
            const user = userId
                ? await prisma.user.findUnique({ where: { id: userId }, select: { collegeId: true } })
                : null;
            scopedCollegeId = user?.collegeId || null;
        }

        await prisma.auditLog.create({
            data: {
                collegeId: scopedCollegeId,
                userId,
                action,
                resourceType,
                resourceId,
                ipAddress,
                userAgent,
                severity,
                details
            }
        });
    } catch (err) {
        // Audit logging should never crash the main request
        console.error("Audit log write failed:", err.message);
    }
};

export default auditLogger;
