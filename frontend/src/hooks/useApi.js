import { useState, useCallback } from "react";
import api from "../services/api";

/**
 * useApi — lightweight hook for API calls with loading and error state.
 *
 * Returns { request, loading, error }
 * 
 * Usage:
 *   const { request, loading } = useApi();
 *   const data = await request({ url: "/feedback", method: "GET" });
 */
export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const request = useCallback(async ({ url, method = "GET", data = null }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api({ url, method, data });
            return response.data;
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.message ||
                "An unexpected error occurred";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { request, loading, error };
}

export default useApi;
