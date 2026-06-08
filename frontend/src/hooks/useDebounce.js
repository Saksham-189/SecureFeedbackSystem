import { useState, useEffect } from "react";

/**
 * useDebounce — delays a value update until input settles.
 * Useful for search inputs to avoid excessive API calls.
 *
 * @param {any} value - the value to debounce
 * @param {number} delay - debounce delay in ms (default: 300)
 * @returns {any} - the debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
