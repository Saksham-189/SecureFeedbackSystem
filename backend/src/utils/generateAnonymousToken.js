import crypto from "crypto";

const generateAnonymousToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

export default generateAnonymousToken;
