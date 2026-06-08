const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        // Zod v4 uses .issues, Zod v3 uses .errors — support both
        const issues = error.issues || error.errors || [];
        const messages = issues.length > 0
            ? issues.map(e => e.message)
            : [error.message];
        return res.status(400).json({
            success: false,
            message: messages.join('. '),
            errors: messages
        });
    }
};

export default validate;
