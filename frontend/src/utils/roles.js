/**
 * Role constants — mirrors backend/src/constants/roles.js exactly.
 * Frontend uses these for UX rendering only.
 * Backend RBAC is the real security layer.
 */
export const ROLES = {
    STUDENT: "STUDENT",
    FACULTY: "FACULTY",
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
};

/** Ordered by privilege level (lowest → highest) */
const ROLE_HIERARCHY = [
    ROLES.STUDENT,
    ROLES.FACULTY,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
];

/** Human-readable labels for display */
export const ROLE_LABELS = {
    [ROLES.STUDENT]: "Student",
    [ROLES.FACULTY]: "Faculty",
    [ROLES.ADMIN]: "Admin",
    [ROLES.SUPER_ADMIN]: "Super Admin",
};

/** Badge color variants per role */
export const ROLE_COLORS = {
    [ROLES.STUDENT]: "bg-emerald-100 text-emerald-700",
    [ROLES.FACULTY]: "bg-amber-100 text-amber-700",
    [ROLES.ADMIN]: "bg-blue-100 text-blue-700",
    [ROLES.SUPER_ADMIN]: "bg-purple-100 text-purple-700",
};

/**
 * Check if a user's role is included in the allowed roles list.
 * Always returns false for null/undefined user — fail-closed.
 */
export function hasRole(user, allowedRoles) {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
}

/**
 * Check if user has at least the given privilege level.
 */
export function hasMinRole(user, minRole) {
    if (!user || !user.role) return false;
    const userLevel = ROLE_HIERARCHY.indexOf(user.role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
    if (userLevel === -1 || requiredLevel === -1) return false;
    return userLevel >= requiredLevel;
}

/**
 * Returns true if user is any admin type.
 */
export function isAdmin(user) {
    return hasRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
}
