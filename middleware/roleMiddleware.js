function roleMiddleware(requiredRole) {
    return (req, res, next) => {
        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Requires ${requiredRole} role`
            });
        }
        next();
    };
}

module.exports = roleMiddleware;