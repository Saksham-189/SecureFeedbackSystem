import { cn } from "../../utils/cn";

const variants = {
    primary:
        "bg-black text-white border border-black hover:bg-slate-900",
    secondary:
        "bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200",
    outline:
        "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50",
    ghost:
        "text-slate-600 hover:bg-slate-100 hover:text-black",
    danger:
        "bg-red-700 text-white border border-red-700 hover:bg-red-800",
};

const sizes = {
    sm: "px-3 py-1.5 text-sm rounded",
    md: "px-5 py-2.5 text-sm rounded",
    lg: "px-7 py-3.5 text-base rounded",
};

/**
 * Button — variant-driven, accessible, with loading state.
 *
 * @param {string} variant - primary | secondary | outline | ghost | danger
 * @param {string} size - sm | md | lg
 * @param {boolean} loading - shows spinner and disables interaction
 * @param {boolean} fullWidth - stretches to container width
 * @param {ReactNode} icon - optional leading icon
 */
const Button = ({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    icon = null,
    className = "",
    type = "button",
    ...props
}) => {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            disabled={isDisabled}
            className={cn(
                "inline-flex items-center justify-center gap-2",
                "font-semibold transition-all duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#3980f4] focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                variants[variant],
                sizes[size],
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {loading ? (
                <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="60"
                        strokeLinecap="round"
                    />
                </svg>
            ) : icon ? (
                <span className="flex-shrink-0">{icon}</span>
            ) : null}

            {children}
        </button>
    );
};

export default Button;
