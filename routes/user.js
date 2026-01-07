const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const adminMiddleware = require('../middlewares/admin');

// Public routes
router.post('/login', userController.login);
router.post('/register', userController.register);

// Protected user route
router.get('/profile', authMiddleware, userController.profile);

// Admin-only CRUD routes
router.get('/users', authMiddleware, adminMiddleware, userController.getAllUsers);
router.get('/users/:id', authMiddleware, adminMiddleware, userController.getUserById);
router.put('/users/:id', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;