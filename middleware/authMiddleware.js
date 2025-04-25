const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Get user from database
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token, user not found' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ error: 'Token is not valid' });
    }
};