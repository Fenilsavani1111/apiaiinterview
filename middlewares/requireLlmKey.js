const { User } = require('../models');

/**
 * Requires the authenticated user to have an llmKey set.
 * Use AFTER authMiddleware.
 */
module.exports = async function requireLlmKey(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'llmKey'] });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.llmKey || String(user.llmKey).trim() === '') {
      return res.status(403).json({
        success: false,
        message: 'LLM key is required. Please set your LLM key to create job posts.',
      });
    }

    next();
  } catch (error) {
    console.error('Require LLM key middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error validating LLM key',
      error: error.message,
    });
  }
};

