import { NavLink, useNavigate } from "react-router-dom";
import { getNavigationForRole } from "../config/navigation";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

const Sidebar = ({ mobileOpen = false, onMobileClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const navItems = getNavigationForRole(user?.role);
    const campaignPath = user?.role === "SUPER_ADMIN" ? "/superadmin/campaigns" : "/admin/campaigns";
    const accountPath = user?.role === "SUPER_ADMIN" ? "/superadmin/users" : user?.role === "ADMIN" ? "/admin/users" : "/faculty";

    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[#131b2e] text-white">
            <div className="p-6 flex flex-col items-start gap-4">
                <img src="/logo.png" alt="SecureFeedback" className="h-10 w-auto object-contain" />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">SecureFeedback</h1>
                    <p className="sf-label text-[#7c839b] mt-1">Operational Intelligence</p>
                </div>
            </div>

            <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/admin" || item.path === "/faculty"}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all border-l-4",
                                isActive
                                    ? "bg-[#d5e3fd] text-[#57657b] border-black translate-x-1"
                                    : "text-[#7c839b] border-transparent hover:bg-[#b9c7e0] hover:text-[#0d1c2f]"
                            )
                        }
                    >
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 space-y-5 border-t border-white/10">
                {["ADMIN", "SUPER_ADMIN"].includes(user?.role) && (
                    <button
                        type="button"
                        onClick={() => navigate(campaignPath)}
                        className="w-full bg-black text-white py-3 rounded font-semibold hover:bg-white hover:text-black transition-colors"
                    >
                        Launch Campaign
                    </button>
                )}
                <div className="space-y-1">
                    <button
                        type="button"
                        onClick={() => navigate(accountPath)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[#7c839b] hover:text-white"
                    >
                        <span className="sf-label text-current">Account</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[#7c839b] hover:text-white"
                    >
                        <span className="sf-label text-current">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-64 border-r border-[#c6c6cd]">
                {sidebarContent}
            </aside>
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-[60] bg-black/40"
                    onClick={onMobileClose}
                    aria-hidden="true"
                />
            )}
            <aside
                className={cn(
                    "lg:hidden fixed top-0 left-0 z-[70] w-72 h-screen transition-transform",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
