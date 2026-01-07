// apiaiinterview/middlewares/admin.js

/**
 * Admin middleware - checks if authenticated user is an admin
 * Must be used after authMiddleware
 * Works by checking the isAdmin flag from the access_token
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user exists (set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Check if user is admin (this comes from the access_token)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }

    // User is admin, proceed to controller
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authorization',
      error: error.message,
    });
  }
};

module.exports = adminMiddleware;