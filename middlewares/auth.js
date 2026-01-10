// apiaiinterview/middlewares/auth.js
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware - verifies JWT token
 * Extracts user info from token and adds to req.user
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

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Please login.',
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    console.log('✅ Auth successful:', { userId: decoded.id, email: decoded.email });

    // Proceed to next middleware/controller
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;