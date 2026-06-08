import crypto from "crypto";

export const csrfProtection = (req, res, next) => {
    // Generate token if it doesn't exist
    let csrfToken = req.cookies['csrf-token'];
    
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString("hex");
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('csrf-token', csrfToken, {
            httpOnly: false, // Must be readable by frontend JS to attach to headers
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
    }


    res.locals.csrfToken = csrfToken;

    
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
       
        const providedToken = req.headers['x-csrf-token'];
        
        if (!providedToken || providedToken !== csrfToken) {
            return res.status(403).json({
                success: false,
                message: "CSRF token validation failed"
            });
        }
    }

    next();
};

export const getCsrfToken = (req, res) => {
    res.json({
        success: true,
        csrfToken: res.locals.csrfToken || req.cookies['csrf-token']
    });
};
