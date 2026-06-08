import { cn } from "../../utils/cn";

/**
 * SearchBar — debounce-ready search input with icon.
 */
const SearchBar = ({
    value,
    onChange,
    placeholder = "Search...",
    className = "",
    ...props
}) => {
    return (
        <div className={cn("relative", className)}>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                🔍
            </span>

            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="
                    w-full rounded-2xl border border-blue-100
                    bg-white pl-11 pr-4 py-2.5
                    text-sm text-slate-800 placeholder:text-slate-400
                    outline-none transition-all
                    focus:ring-4 focus:ring-blue-200 focus:border-blue-300
                "
                {...props}
            />
        </div>
    );
};

export default SearchBar;
