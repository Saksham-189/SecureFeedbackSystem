import { cn } from "../../utils/cn";

const Textarea = ({
    label,
    error,
    className = "",
    id,
    rows = 4,
    ...props
}) => {
    const textareaId = id || `textarea-${label?.replace(/\s+/g, "-").toLowerCase()}`;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-slate-700"
                >
                    {label}
                </label>
            )}

            <textarea
                id={textareaId}
                rows={rows}
                aria-describedby={errorId}
                aria-invalid={!!error}
                className={cn(
                    "w-full rounded border bg-[#f7f9fb] px-4 py-3",
                    "text-sm text-slate-800 placeholder:text-slate-400",
                    "outline-none transition-all duration-200 resize-y",
                    "focus:ring-2 focus:ring-[#3980f4]/25 focus:border-[#3980f4]",
                    "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
                    error
                        ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                        : "border-[#c6c6cd]",
                    className
                )}
                {...props}
            />

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

export default Textarea;
