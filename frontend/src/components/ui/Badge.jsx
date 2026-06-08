import { cn } from "../../utils/cn";

const variants = {
    default: "bg-slate-100 text-slate-700",
    secondary: "bg-slate-100 text-slate-700",
    primary: "bg-blue-100 text-blue-700",
    info: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    danger: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
};

const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-3.5 py-1.5",
};

/**
 * Badge — small label for status/role display.
 */
const Badge = ({
    children,
    variant = "default",
    size = "md",
    className = "",
    dot = false,
}) => {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5",
                "font-semibold rounded-full",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {dot && (
                <span
                    className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        "bg-current opacity-70"
                    )}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    );
};

export default Badge;
