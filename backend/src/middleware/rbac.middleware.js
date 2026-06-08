import auditLogger from "../utils/auditLogger.js";

const rbacMiddleware = (...allowedRoles) => {

    return async (req, res, next) => {

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {

            await auditLogger({

                userId: req.user?.id,

                action: "UNAUTHORIZED_ACCESS",

                resourceType: "RBAC",

                severity: "CRITICAL"
            });

            return res.status(403).json({
                success: false,
                message: "Forbidden: insufficient permissions"
            });
        }

        next();
    };
};

export default rbacMiddleware;