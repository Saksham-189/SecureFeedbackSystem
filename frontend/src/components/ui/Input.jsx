import { cn } from "../../utils/cn";

/**
 * Input — styled text input with label, error state, and icon support.
 *
 * Security: no autocomplete on sensitive fields by default.
 * Accessibility: label linked via htmlFor, error announced via aria-describedby.
 */
const Input = ({
    label,
    error,
    icon = null,
    className = "",
    id,
    ...props
}) => {
    const inputId = id || `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-slate-700"
                >
                    {label}
                </label>
            )}

            <div className="relative">
                {icon && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        {icon}
                    </span>
                )}

                <input
                    id={inputId}
                    aria-describedby={errorId}
                    aria-invalid={!!error}
                    className={cn(
                    "w-full rounded border bg-[#f7f9fb] px-4 py-3",
                        "text-sm text-slate-800 placeholder:text-slate-400",
                        "outline-none transition-all duration-200",
                    "focus:ring-2 focus:ring-[#3980f4]/25 focus:border-[#3980f4]",
                        "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
                        error
                            ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                            : "border-[#c6c6cd]",
                        icon && "pl-11",
                        className
                    )}
                    {...props}
                />
            </div>

            {error && (
                <p
                    id={errorId}
                    className="text-xs text-red-500 font-medium pl-1"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
