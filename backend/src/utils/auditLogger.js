import prisma from "../prisma/prismaClient.js";

const auditLogger = async ({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    severity = "INFO",
    details = null
}) => {

    try {
        await prisma.auditLog.create({
            data: {
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