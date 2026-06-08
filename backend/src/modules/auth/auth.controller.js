import * as authService from './auth.service.js';

const getClientInfo = (req) => ({
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    deviceFingerprint: req.headers['x-device-fingerprint'] || null
});

// Set secure cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    };

    // Access token - short lived (15m)
    res.cookie('token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, 
    });

    // Refresh token - long lived (7d)
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh'
    });
};

export const register = async (req, res) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getMetadata = async (req, res) => {
    try {
        const metadata = await authService.getRegistrationMetadata();
        res.status(200).json({ success: true, data: metadata });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const clientInfo = getClientInfo(req);
        const { user, accessToken, refreshToken } = await authService.login(req.body, clientInfo);
        
        setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user }, // Exclude tokens from body!
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
    } catch (err) {
        console.error("Logout error (non-fatal):", err);
    } finally {
        // Always clear cookies on client
        res.clearCookie('token');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
};

export const refreshSession = async (req, res) => {
    try {
        const oldRefreshToken = req.cookies?.refreshToken;
        if (!oldRefreshToken) {
            return res.status(401).json({ success: false, message: "No refresh token" });
        }

        const clientInfo = getClientInfo(req);
        const { accessToken, refreshToken } = await authService.refreshSession(oldRefreshToken, clientInfo);

        setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: "Session refreshed"
        });
    } catch (error) {
        // If refresh fails, clear cookies so user must log in again
        res.clearCookie('token');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};
