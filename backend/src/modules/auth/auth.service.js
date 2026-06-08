import prisma from "../../prisma/prismaClient.js";
import { hashPassword, comparePassword } from "../../utils/hashPassword.js";
import { generateAccessToken, getRefreshTokenExpiryDate } from "../../utils/generateToken.js";
import { generateRandomToken, hashToken } from "../../utils/cryptoUtils.js";
import auditLogger from "../../utils/auditLogger.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const register = async (data) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await hashPassword(data.password);

    const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
    if (!studentRole) {
        throw new Error("System configuration error: STUDENT role not found");
    }

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            passwordHash: hashedPassword,
            collegeId: data.collegeId,
            departmentId: data.departmentId || null,
            roleId: studentRole.id
        }
    });

    await auditLogger({
        userId: user.id,
        action: "USER_REGISTERED",
        resourceType: "AUTH",
        resourceId: user.id,
        severity: "INFO"
    });

    return { id: user.id, email: user.email, name: user.name };
};

export const getRegistrationMetadata = async () => {
    const colleges = await prisma.college.findMany({ select: { id: true, name: true } });
    const departments = await prisma.department.findMany({ 
        select: { id: true, name: true, code: true, collegeId: true } 
    });
    return { colleges, departments };
};

export const login = async (data, clientInfo) => {
    const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { role: true }
    });

    if (!user) {
        await auditLogger({
            action: "LOGIN_FAILED",
            resourceType: "AUTH",
            severity: "WARNING",
            details: { email: data.email, reason: "User not found" },
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent
        });
        throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.isLocked) {
        if (user.lockoutUntil && new Date() < user.lockoutUntil) {
            await auditLogger({
                userId: user.id,
                action: "LOGIN_FAILED_LOCKED",
                resourceType: "AUTH",
                severity: "WARNING",
                ipAddress: clientInfo.ipAddress,
                userAgent: clientInfo.userAgent
            });
            throw new Error("Account is temporarily locked. Please try again later.");
        } else {
            // Lockout expired, reset attempts
            await prisma.user.update({
                where: { id: user.id },
                data: { isLocked: false, failedLoginAttempts: 0, lockoutUntil: null }
            });
        }
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
        const attempts = user.failedLoginAttempts + 1;
        const willLock = attempts >= MAX_FAILED_ATTEMPTS;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: attempts,
                isLocked: willLock,
                lockoutUntil: willLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
            }
        });

        await auditLogger({
            userId: user.id,
            action: "INVALID_PASSWORD",
            resourceType: "AUTH",
            resourceId: user.id,
            severity: willLock ? "CRITICAL" : "WARNING",
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent
        });
        throw new Error("Invalid credentials");
    }

    // Login successful, reset attempts
    await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, isLocked: false, lockoutUntil: null, lastLogin: new Date() }
    });

    // Generate tokens
    const accessToken = generateAccessToken({
        id: user.id,
        role: user.role.name,
        collegeId: user.collegeId
    });

    const refreshToken = generateRandomToken(40);
    const refreshTokenHash = hashToken(refreshToken);

    // Create session in DB
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            deviceFingerprint: clientInfo.deviceFingerprint,
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
            expiresAt: getRefreshTokenExpiryDate()
        }
    });

    await auditLogger({
        userId: user.id,
        action: "LOGIN_SUCCESS",
        resourceType: "AUTH",
        resourceId: user.id,
        severity: "INFO",
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
    });

    return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role.name },
        accessToken,
        refreshToken
    };
};

export const logout = async (refreshToken) => {
    if (!refreshToken) return;
    
    const refreshTokenHash = hashToken(refreshToken);
    
    const session = await prisma.session.findUnique({
        where: { refreshTokenHash }
    });

    if (session) {
        await prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        });

        await auditLogger({
            userId: session.userId,
            action: "LOGOUT",
            resourceType: "AUTH",
            severity: "INFO"
        });
    }
};

export const refreshSession = async (refreshToken, clientInfo) => {
    if (!refreshToken) throw new Error("No refresh token provided");

    const refreshTokenHash = hashToken(refreshToken);

    const session = await prisma.session.findUnique({
        where: { refreshTokenHash },
        include: { user: { include: { role: true } } }
    });

    if (!session) {
        throw new Error("Invalid refresh token");
    }

    // Token reuse detection (compromised token family)
    if (session.isRevoked) {
        // A revoked token was used. This is a security breach (replay attack).
        // Revoke ALL active sessions for this user.
        await prisma.session.updateMany({
            where: { userId: session.userId, isRevoked: false },
            data: { isRevoked: true }
        });

        await auditLogger({
            userId: session.userId,
            action: "COMPROMISED_TOKEN_REUSE",
            resourceType: "AUTH",
            severity: "CRITICAL",
            details: { reason: "Revoked refresh token was presented", ipAddress: clientInfo.ipAddress }
        });

        throw new Error("Security alert: Compromised session detected. All sessions revoked.");
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
        await prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        });
        throw new Error("Refresh token expired");
    }

    // Token is valid. Rotate it.
    // Invalidate the old one.
    await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true }
    });

    // Generate new tokens
    const newAccessToken = generateAccessToken({
        id: session.user.id,
        role: session.user.role.name,
        collegeId: session.user.collegeId
    });

    const newRefreshToken = generateRandomToken(40);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Create new session
    await prisma.session.create({
        data: {
            userId: session.user.id,
            refreshTokenHash: newRefreshTokenHash,
            deviceFingerprint: clientInfo.deviceFingerprint,
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
            expiresAt: getRefreshTokenExpiryDate()
        }
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};