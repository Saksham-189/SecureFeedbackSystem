import { Link, useLocation } from "react-router-dom";
import { cn } from "../utils/cn";

/**
 * Breadcrumbs — auto-generated from current route path.
 * Maps path segments to human-readable labels.
 */
const pathLabels = {
    admin: "Admin",
    student: "Student",
    "create-form": "Create Form",
    analytics: "Analytics",
    "audit-logs": "Audit Logs",
    feedback: "Feedback",
    settings: "Settings",
};

const Breadcrumbs = ({ className = "" }) => {
    const location = useLocation();
    const segments = location.pathname
        .split("/")
        .filter(Boolean);

    if (segments.length <= 1) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("mb-6", className)}
        >
            <ol className="flex items-center gap-2 text-sm">
                {segments.map((segment, index) => {
                    const path = "/" + segments.slice(0, index + 1).join("/");
                    const isLast = index === segments.length - 1;
                    const label =
                        pathLabels[segment] ||
                        segment.charAt(0).toUpperCase() + segment.slice(1);

                    return (
                        <li key={path} className="flex items-center gap-2">
                            {index > 0 && (
                                <span
                                    className="text-slate-300"
                                    aria-hidden="true"
                                >
                                    /
                                </span>
                            )}

                            {isLast ? (
                                <span
                                    className="font-medium text-slate-800"
                                    aria-current="page"
                                >
                                    {label}
                                </span>
                            ) : (
                                <Link
                                    to={path}
                                    className="
                                        text-slate-500
                                        hover:text-blue-600
                                        transition-colors
                                    "
                                >
                                    {label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
