const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');

// Generate JWT token (only access token, stored in localStorage on client)
const generateToken = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' } // 7 days validity
  );

  return accessToken;
};

const userController = {
  // ============================================
  // LOGIN
  // ============================================
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Find user by email
      const user = await User.findOne({
        where: { email: email.trim() },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate token
      const accessToken = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          access_token: accessToken,
        },
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message,
      });
    }
  },

  // ============================================
  // REGISTER (NO AUTO-LOGIN)
  // ============================================
  register: async (req, res) => {
    try {
      const { name, email, phoneNumber, password } = req.body;

      console.log('📝 REGISTER ATTEMPT:', { email, name });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name is required and must be at least 2 characters',
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email: email.trim() },
      });

      if (existingUser) {
        console.log('❌ Email already exists:', email);
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await User.create({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        password: hashedPassword,
      });

      console.log('✅ Registration successful:', { email: newUser.email, userId: newUser.id });

      // ✅ IMPORTANT: Return success WITHOUT access_token
      // User must login separately after registration
      return res.status(201).json({
        success: true,
        message: 'User registered successfully. Please login to continue.',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phoneNumber: newUser.phoneNumber,
        },
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during registration',
        error: error.message,
      });
    }
  },

  // ============================================
  // GET PROFILE (Protected)
  // ============================================
  profile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'email', 'name', 'phoneNumber', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('❌ Profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching profile',
        error: error.message,
      });
    }
  },

  // ============================================
  // GET ALL USERS (Anyone can view)
  // ============================================
  getAllUsers: async (req, res) => {
    try {
      console.log('='.repeat(50));
      console.log('📊 GET ALL USERS API CALLED');
      console.log('Query Params:', req.query);
      console.log('='.repeat(50));

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const searchParam = req.query.search;
      const offset = (page - 1) * limit;

      console.log(`📄 Pagination: Page=${page}, Limit=${limit}, Offset=${offset}`);

      // Build the query options
      const queryOptions = {
        attributes: ['id', 'email', 'name', 'phoneNumber', 'createdAt', 'updatedAt'],
        limit: limit,
        offset: offset,
        order: [['createdAt', 'DESC']],
        raw: false,
      };

      // Handle search
      if (
        searchParam !== undefined &&
        searchParam !== null &&
        searchParam.toString().trim() !== ''
      ) {
        const searchTerm = searchParam.toString().trim();
        console.log(`🔍 Search filter active: "${searchTerm}"`);

        queryOptions.where = {
          [Op.or]: [
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            { name: { [Op.iLike]: `%${searchTerm}%` } },
          ],
        };
      } else {
        console.log('📋 No search filter - fetching all users');
      }

      console.log('🚀 Executing Sequelize query...');

      // Execute the query
      const { count, rows } = await User.findAndCountAll(queryOptions);

      console.log(`✅ Query successful!`);
      console.log(`📊 Total users in DB: ${count}`);
      console.log(`📦 Users returned in this page: ${rows.length}`);
      console.log('='.repeat(50));

      // Transform the results
      const users = rows.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        users: users,
        pagination: {
          total: count,
          page: page,
          limit: limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('='.repeat(50));
      console.error('❌ GET ALL USERS ERROR');
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.error('='.repeat(50));

      return res.status(500).json({
        success: false,
        message: 'Server error fetching users',
        error: error.message,
        errorType: error.name,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  },

  // ============================================
  // GET USER BY ID
  // ============================================
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: ['id', 'email', 'name', 'phoneNumber', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching user',
        error: error.message,
      });
    }
  },

  // ============================================
  // UPDATE USER
  // ============================================
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phoneNumber, password } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if new email already exists (if changing email)
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists',
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await user.update(updateData);

      const updatedUser = await User.findByPk(id, {
        attributes: ['id', 'email', 'name', 'phoneNumber', 'createdAt', 'updatedAt'],
      });

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phoneNumber: updatedUser.phoneNumber,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      console.error('❌ Update user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating user',
        error: error.message,
      });
    }
  },

  // ============================================
  // DELETE USER
  // ============================================
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting own account
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await user.destroy();

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error deleting user',
        error: error.message,
      });
    }
  },
};

module.exports = userController;
