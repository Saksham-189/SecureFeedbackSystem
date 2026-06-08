import { NavLink, useNavigate } from "react-router-dom";
import Dropdown from "../components/ui/Dropdown";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/roles";

const topNavByRole = {
    [ROLES.STUDENT]: [
        { label: "Dashboard", path: "/student" },
        { label: "Profile", path: "/student/profile" },
    ],
    [ROLES.FACULTY]: [
        { label: "Dashboard", path: "/faculty" },
    ],
    [ROLES.ADMIN]: [
        { label: "Dashboard", path: "/admin" },
        { label: "Analytics", path: "/admin" },
        { label: "Campaigns", path: "/admin/campaigns" },
        { label: "Reports", path: "/admin/audit-logs" },
    ],
    [ROLES.SUPER_ADMIN]: [
        { label: "Dashboard", path: "/superadmin" },
        { label: "Campaigns", path: "/superadmin/campaigns" },
        { label: "Reports", path: "/superadmin/audit-logs" },
    ],
};

const Topbar = ({ onMenuToggle, compact = false }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const navItems = topNavByRole[user?.role] || [];

    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    const profileMenuItems = [
        {
            label: "Profile",
            icon: "P",
            onClick: () => navigate(user?.role === ROLES.STUDENT ? "/student/profile" : user?.role === ROLES.FACULTY ? "/faculty" : "/admin/users"),
        },
        { divider: true },
        {
            label: "Sign Out",
            icon: "X",
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <header className="h-16 bg-[#f7f9fb] border-b border-[#c6c6cd] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
            <div className="flex items-center gap-8">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden w-9 h-9 border border-[#c6c6cd] rounded flex items-center justify-center"
                    aria-label="Toggle sidebar"
                >
                    <span className="text-lg leading-none">☰</span>
                </button>
                <div className="flex items-baseline gap-8">
                    <span className="text-2xl font-bold tracking-tight text-black">SecureFeedback</span>
                    <nav className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                end={item.path === "/admin" || item.path === "/superadmin" || item.path === "/student" || item.path === "/faculty"}
                                className={({ isActive }) =>
                                    `text-sm pb-1 transition-colors ${
                                        isActive
                                            ? "text-black border-b-2 border-black"
                                            : "text-[#45464d] hover:text-black"
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!compact && (
                    <div className="hidden xl:flex items-center bg-[#f2f4f6] border border-[#c6c6cd] rounded px-3 py-2 w-80">
                        <span className="text-[#45464d] mr-2">Q</span>
                        <input
                            className="bg-transparent border-none outline-none text-sm w-full p-0 focus:ring-0"
                            placeholder="Command Center Search..."
                        />
                        <span className="sf-label text-[10px] bg-[#e6e8ea] px-1 rounded">K</span>
                    </div>
                )}
                <button className="w-9 h-9 rounded border border-transparent hover:border-[#c6c6cd]" aria-label="Notifications">
                    !
                </button>
                <button className="w-9 h-9 rounded border border-transparent hover:border-[#c6c6cd]" aria-label="Settings">
                    S
                </button>
                <Dropdown
                    trigger={
                        <button className="w-9 h-9 rounded-full border border-[#c6c6cd] bg-[#e6e8ea] text-sm font-bold">
                            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                        </button>
                    }
                    items={profileMenuItems}
                    align="right"
                />
            </div>
        </header>
    );
};

export default Topbar;
