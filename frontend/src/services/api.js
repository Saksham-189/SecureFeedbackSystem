import axios from "axios";

// Generate a simple device fingerprint on boot
// In a real enterprise system, use FingerprintJS or similar
const generateDeviceFingerprint = () => {
    try {
        const str = navigator.userAgent + navigator.language + screen.colorDepth + screen.width + screen.height;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return Math.abs(hash).toString(16);
    } catch {
        return "unknown";
    }
};

const deviceFingerprint = generateDeviceFingerprint();

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "x-device-fingerprint": deviceFingerprint
    },
});

let onAuthFailure = null;
export function setAuthFailureHandler(handler) {
    onAuthFailure = handler;
}

// Intercept request to attach CSRF token dynamically if it exists
api.interceptors.request.use((config) => {
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
        // Read the CSRF token from the cookie
        const csrfCookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrf-token="));
            
        if (csrfCookie) {
            config.headers['x-csrf-token'] = csrfCookie.split("=")[1];
        }
    }
    return config;
});

// State for refresh token concurrency control
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            const url = originalRequest.url || "";
            const isAuthEndpoint =
                url.includes("/auth/login") ||
                url.includes("/auth/register") ||
                url.includes("/auth/refresh");

            if (isAuthEndpoint) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If currently refreshing, queue the request
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh session
                await axios.post(`${baseURL}/auth/refresh`, {}, {
                    withCredentials: true,
                    headers: {
                        "x-device-fingerprint": deviceFingerprint
                    }
                });

                isRefreshing = false;
                processQueue(null);

                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(refreshError, null);

                // Refresh failed - session is truly dead
                if (onAuthFailure) {
                    onAuthFailure();
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Initialization: Fetch CSRF token on startup
export const initializeSecurityLayer = async () => {
    try {
        await api.get("/csrf-token");
    } catch (e) {
        console.error("Failed to initialize CSRF protection", e);
    }
};

export default api;
