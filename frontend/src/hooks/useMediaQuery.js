import { useState, useEffect } from "react";

/**
 * useMediaQuery — reactive CSS media query hook.
 * Returns true when the viewport matches the given query.
 *
 * Common breakpoints:
 * - mobile:  "(max-width: 767px)"
 * - tablet:  "(min-width: 768px) and (max-width: 1023px)"
 * - desktop: "(min-width: 1024px)"
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [query]);

    return matches;
}

/** Pre-defined breakpoint hooks */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () =>
    useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

export default useMediaQuery;
