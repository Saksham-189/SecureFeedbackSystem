import { ROLES } from "../utils/roles";

const navigationConfig = [
    {
        label: "Overview",
        icon: "[]",
        path: "/superadmin",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Campaigns",
        icon: ">>",
        path: "/superadmin/campaigns",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Academic Structure",
        icon: "##",
        path: "/superadmin/academic",
        roles: [ROLES.SUPER_ADMIN],
    },
    {
        label: "Users",
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
        label: "Overview",
        icon: "[]",
        path: "/admin",
        roles: [ROLES.ADMIN],
    },
    {
        label: "Campaigns",
        icon: ">>",
        path: "/admin/campaigns",
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
        label: "Dashboard",
        icon: "[]",
        path: "/faculty",
        roles: [ROLES.FACULTY],
    },
    {
        label: "Dashboard",
        icon: "[]",
        path: "/student",
        roles: [ROLES.STUDENT],
    },
    {
        label: "Campaigns",
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
