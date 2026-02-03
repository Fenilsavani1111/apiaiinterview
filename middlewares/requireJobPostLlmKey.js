const { User } = require('../models');

/**
 * Requires the authenticated user to have jobPostLlmKey set.
 * Use AFTER authMiddleware.
 */
module.exports = async function requireJobPostLlmKey(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'jobPostLlmKey'] });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.jobPostLlmKey || String(user.jobPostLlmKey).trim() === '') {
      return res.status(403).json({
        success: false,
        message: 'Job post LLM key is required. Please set it to create job posts.',
      });
    }

    next();
  } catch (error) {
    console.error('Require Job Post LLM key middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error validating Job Post LLM key',
      error: error.message,
    });
  }
};

