import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/roles";

const DashboardLayout = ({ title, subtitle }) => {
    const { user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const isStudent = user?.role === ROLES.STUDENT;

    const toggleMobile = useCallback(() => {
        setMobileOpen((prev) => !prev);
    }, []);

    const closeMobile = useCallback(() => {
        setMobileOpen(false);
    }, []);

    return (
        <div className="sf-shell flex">
            {!isStudent && (
                <Sidebar
                    collapsed={false}
                    mobileOpen={mobileOpen}
                    onMobileClose={closeMobile}
                />
            )}

            <div className={`flex-1 flex flex-col min-w-0 ${!isStudent ? "lg:ml-64" : ""}`}>
                <Topbar
                    onMenuToggle={toggleMobile}
                    title={title}
                    subtitle={subtitle}
                    compact={isStudent}
                />

                <main className={isStudent ? "flex-1 px-4 py-10" : "flex-1 p-6 overflow-y-auto"}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
