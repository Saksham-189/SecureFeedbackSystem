import crypto from "crypto";

/**
 * Generate a cryptographically secure random token.
 * Used for refresh tokens, password reset tokens, etc.
 * @param {number} length - Number of bytes to generate (default 32)
 * @returns {string} - Hex encoded random string
 */
export const generateRandomToken = (length = 32) => {
    return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash a token using SHA-256 for secure database storage.
 * If the database is compromised, the attacker cannot use the hashed tokens
 * to authenticate.
 * @param {string} token - The raw token to hash
 * @returns {string} - Hex encoded SHA-256 hash
 */
export const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

// ============================================================================
// FIELD-LEVEL ENCRYPTION (AES-256-GCM)
// ============================================================================

// The encryption key should be 32 bytes (256 bits).
// We use a fallback for development if not provided, but in production,
// this MUST be securely managed and injected via environment variables.
const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY 
    ? Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex') 
    : crypto.scryptSync('fallback-dev-key-do-not-use-in-prod', 'salt', 32);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM.
 * @param {string} text - The plaintext to encrypt.
 * @returns {string} - The format is IV:AuthTag:EncryptedData (all base64)
 */
export const encryptField = (text) => {
    if (!text) return text;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt a string previously encrypted with encryptField.
 * @param {string} encryptedText - The formatted encrypted string.
 * @returns {string} - The decrypted plaintext.
 */
export const decryptField = (encryptedText) => {
    if (!encryptedText) return encryptedText;
    
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) throw new Error("Invalid encrypted text format");
        
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encryptedData = parts[2];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e.message);
        throw new Error("Failed to decrypt sensitive data");
    }
};
