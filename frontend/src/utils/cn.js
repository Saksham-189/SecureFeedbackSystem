/**
 * Conditional className merger.
 * Filters falsy values and joins remaining classes.
 * Usage: cn("base", isActive && "active", error && "error-state")
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
