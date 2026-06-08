/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { getCurrentUser, logoutUser } from "../services/auth.service";
import { setAuthFailureHandler } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = useCallback(() => {
        setUser(null);
    }, []);

    const handleAuthFailure = useCallback(() => {
        clearSession();
    }, [clearSession]);

    useEffect(() => {
        setAuthFailureHandler(handleAuthFailure);
        return () => setAuthFailureHandler(null);
    }, [handleAuthFailure]);

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const data = await getCurrentUser();
                if (!cancelled) setUser(data.user);
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        restoreSession();
        return () => {
            cancelled = true;
        };
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } finally {
            clearSession();
        }
    }, [clearSession]);

    const loginSuccess = useCallback((userData) => {
        setUser(userData);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                logout,
                loginSuccess,
                setUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
