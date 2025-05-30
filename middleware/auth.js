const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            console.log('No Authorization header found');
            return res.status(401).json({ message: 'No Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Received token:', token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded token:', decoded);

        const user = await User.findById(decoded.userId);
        console.log('Found user:', user ? user._id : 'No user found');

        if (!user) {
            console.log('User not found with ID:', decoded.userId);
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};

const adminAuth = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admins only!' });
    }
    next();
};

module.exports = { auth, adminAuth };
