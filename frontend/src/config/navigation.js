import { ROLES } from "../utils/roles";

const navigationConfig = [
    {
        label: "Overview",
        icon: "[]",
        path: "/superadmin",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Colleges",
        icon: ">>",
        path: "/superadmin/colleges",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "College Admins",
        icon: "@@",
        path: "/superadmin/users",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Audit Logs",
        icon: "!!",
        path: "/superadmin/audit-logs",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Profile",
        icon: "@@",
        path: "/superadmin/profile",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Overview",
        icon: "[]",
        path: "/admin",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Forms",
        icon: "[]",
        path: "/admin/forms",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Academic Structure",
        icon: "##",
        path: "/admin/academic",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Users",
        icon: "@@",
        path: "/admin/users",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Audit Logs",
        icon: "!!",
        path: "/admin/audit-logs",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Profile",
        icon: "@@",
        path: "/admin/profile",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Dashboard",
        icon: "[]",
        path: "/faculty",
        roles: [ROLES.FACULTY],
    },
    {
        label: "Profile",
        icon: "@@",
        path: "/faculty/profile",
        roles: [ROLES.FACULTY],
    },
    {
        label: "Dashboard",
        icon: "[]",
        path: "/student",
        roles: [ROLES.STUDENT],
    },
    {
        label: "Feedback Forms",
        icon: ">>",
        path: "/student/campaigns",
        roles: [ROLES.STUDENT],
    },
    {
        label: "Submissions",
        icon: "VV",
        path: "/student/submissions",
        roles: [ROLES.STUDENT],
    },
    {
        label: "Privacy",
        icon: "**",
        path: "/student/privacy",
        roles: [ROLES.STUDENT],
    },
    {
        label: "Profile",
        icon: "@@",
        path: "/student/profile",
        roles: [ROLES.STUDENT],
    },
];

export function getNavigationForRole(userRole) {
    if (!userRole) return [];
    return navigationConfig.filter((item) => item.roles.includes(userRole));
}

export default navigationConfig;
