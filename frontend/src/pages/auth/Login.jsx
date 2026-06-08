import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { loginUser } from "../../services/auth.service";
import { Button, Input } from "../../components/ui";
import { ROLES } from "../../utils/roles";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { loginSuccess, isAuthenticated, user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(getDashboardPath(user.role), { replace: true });
        }
    }, [isAuthenticated, navigate, user]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const result = await loginUser({ email, password });
            if (result.success) {
                const userData = result.data?.user || result.data;
                loginSuccess(userData);
                toast.success("Signed in successfully");
                navigate(location.state?.from || getDashboardPath(userData.role?.name || userData.role), { replace: true });
            }
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || "Invalid credentials";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center">
                    <img src="/logo.png" alt="SecureFeedback" className="h-16 w-auto object-contain mb-4" />
                    <h1 className="text-3xl font-bold text-black text-center">SecureFeedback</h1>
                    <p className="sf-label mt-2 text-center">Operational Intelligence</p>
                </div>

                <section className="sf-panel p-8">
                    <div className="mb-6">
                        <p className="sf-label">Secure Session</p>
                        <h2 className="text-2xl font-semibold text-black mt-2">Sign in</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@institution.edu"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                        />

                        {error && (
                            <div className="border border-[#ba1a1a] bg-[#ffdad6]/40 px-4 py-3 text-sm text-[#93000a]" role="alert">
                                {error}
                            </div>
                        )}

                        <Button type="submit" size="lg" loading={loading} fullWidth>
                            {loading ? "Authenticating..." : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-5 text-center text-sm text-[#45464d]">
                        <span>Do not have an account? </span>
                        <Link to="/register" className="font-semibold text-black underline underline-offset-4">Sign up</Link>
                    </div>
                </section>

                <p className="text-xs text-[#6b7280] mt-5">
                    Sessions are protected with httpOnly cookies, CSRF validation, and role-based access control.
                </p>
            </div>
        </main>
    );
}

function getDashboardPath(role) {
    switch (role) {
        case ROLES.SUPER_ADMIN:
            return "/superadmin";
        case ROLES.ADMIN:
            return "/admin";
        case ROLES.FACULTY:
            return "/faculty";
        case ROLES.STUDENT:
            return "/student";
        default:
            return "/";
    }
}
