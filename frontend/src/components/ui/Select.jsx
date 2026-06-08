import { cn } from "../../utils/cn";

const Select = ({
    label,
    error,
    options = [],
    placeholder = "Select...",
    className = "",
    id,
    ...props
}) => {
    const selectId = id || `select-${label?.replace(/\s+/g, "-").toLowerCase()}`;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-sm font-medium text-slate-700"
                >
                    {label}
                </label>
            )}

            <select
                id={selectId}
                aria-describedby={errorId}
                aria-invalid={!!error}
                className={cn(
                    "w-full rounded border bg-[#f7f9fb] px-4 py-3",
                    "text-sm text-slate-800",
                    "outline-none transition-all duration-200",
                    "focus:ring-2 focus:ring-[#3980f4]/25 focus:border-[#3980f4]",
                    "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
                    "appearance-none cursor-pointer",
                    error
                        ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                        : "border-[#c6c6cd]",
                    className
                )}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 1rem center",
                }}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option
                        key={opt.value}
                        value={opt.value}
                    >
                        {opt.label}
                    </option>
                ))}
            </select>

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

export default Select;
