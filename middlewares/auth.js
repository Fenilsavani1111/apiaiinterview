// apiaiinterview/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 * Works with access_token from login response
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.',
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }

    // Get user from database to verify token and get latest user data
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email', 'name', 'phoneNumber', 'isAdmin', 'access_token']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Verify token matches the one in database
    if (user.access_token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Token mismatch. Please login again.',
      });
    }

    // Attach user to request object (without sensitive data)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
    };

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;