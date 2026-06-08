import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border border-[#c6c6cd] bg-white flex items-center justify-center mx-auto animate-pulse">
                        <span className="font-mono text-xl">S</span>
                    </div>
                    <p className="sf-label">Validating secure session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location.pathname }} replace />;
    }

    if (allowedRoles?.length) {
        const userRole = user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
