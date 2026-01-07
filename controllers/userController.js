// apiaiinterview/controllers/userController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '3d' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '365d' }
  );

  return { accessToken, refreshToken };
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

      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: email },
            { username: email }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      await user.update({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          isAdmin: user.isAdmin,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message,
      });
    }
  },

  // ============================================
  // REGISTER
  // ============================================
  register: async (req, res) => {
    try {
      const { name, username, email, phoneNumber, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required',
        });
      }

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username or email already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        name,
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        isAdmin: false,
      });

      const { accessToken, refreshToken } = generateTokens(newUser);

      await newUser.update({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          phoneNumber: newUser.phoneNumber,
          isAdmin: newUser.isAdmin,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
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
        attributes: ['id', 'username', 'email', 'name', 'phoneNumber', 'isAdmin', 'createdAt', 'updatedAt']
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
      console.error('Profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching profile',
        error: error.message,
      });
    }
  },

  // ============================================
  // ADMIN: GET ALL USERS (ABSOLUTE FINAL FIX)
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

      // Build the query options with explicit attributes
      const queryOptions = {
        attributes: [
          'id',
          'username', 
          'email', 
          'name', 
          'phoneNumber',  // This will be mapped to phone_number
          'isAdmin',      // This will be mapped to "isAdmin"
          'createdAt',
          'updatedAt'
        ],
        limit: limit,
        offset: offset,
        order: [['createdAt', 'DESC']],
        raw: false  // Important: get model instances, not raw data
      };

      // Handle search - CRITICAL FIX
      if (searchParam !== undefined && searchParam !== null && searchParam.toString().trim() !== '') {
        const searchTerm = searchParam.toString().trim();
        console.log(`🔍 Search filter active: "${searchTerm}"`);
        
        queryOptions.where = {
          [Op.or]: [
            { username: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            { name: { [Op.iLike]: `%${searchTerm}%` } }
          ]
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

      // Transform the results to ensure proper format
      const users = rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
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
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // ============================================
  // ADMIN: GET USER BY ID
  // ============================================
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: ['id', 'username', 'email', 'name', 'phoneNumber', 'isAdmin', 'createdAt', 'updatedAt']
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
          username: user.username,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching user',
        error: error.message,
      });
    }
  },

  // ============================================
  // ADMIN: UPDATE USER
  // ============================================
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, username, email, phoneNumber, password, isAdmin } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (username && username !== user.username) {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Username already exists',
          });
        }
      }

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
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await user.update(updateData);

      const updatedUser = await User.findByPk(id, {
        attributes: ['id', 'username', 'email', 'name', 'phoneNumber', 'isAdmin', 'createdAt', 'updatedAt']
      });

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          name: updatedUser.name,
          phoneNumber: updatedUser.phoneNumber,
          isAdmin: updatedUser.isAdmin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        },
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating user',
        error: error.message,
      });
    }
  },

  // ============================================
  // ADMIN: DELETE USER
  // ============================================
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

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
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error deleting user',
        error: error.message,
      });
    }
  },
};

module.exports = userController;