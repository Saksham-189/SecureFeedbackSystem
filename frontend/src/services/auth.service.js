import api from "./api";

/**
 * Login — sends credentials, backend sets httpOnly cookie.
 * Returns { success, message, data: { user, token } }
 */
export const loginUser = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
};

/**
 * Get current authenticated user from session cookie.
 * Returns { success, user } where user = decoded JWT payload.
 * Throws if no valid session exists.
 */
export const getCurrentUser = async () => {
    const response = await api.get("/auth/me");
    return response.data;
};

/**
 * Logout — clears the httpOnly cookie server-side.
 * Frontend should also clear user state after this call.
 */
export const logoutUser = async () => {
    const response = await api.post("/auth/logout");
    return response.data;
};

/**
 * Register a new user.
 * Returns { success, message, data: user }
 */
export const registerUser = async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
};

/**
 * Fetch registration metadata (colleges and roles).
 * Returns { success, data: { roles, colleges } }
 */
export const getRegistrationMetadata = async () => {
    const response = await api.get("/auth/metadata");
    return response.data;
};