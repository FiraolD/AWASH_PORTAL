export const validateBody = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: result.error.errors.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }
        req.body = result.data;
        return next();
    };
};
