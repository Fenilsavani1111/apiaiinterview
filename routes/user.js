// apiaiinterview/routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.post('/login', userController.login);
router.post('/register', userController.register);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
router.get('/profile', authMiddleware, userController.profile);
router.get('/users', authMiddleware, userController.getAllUsers);
router.get('/users/:id', authMiddleware, userController.getUserById);
router.put('/users/:id', authMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, userController.deleteUser);

module.exports = router;