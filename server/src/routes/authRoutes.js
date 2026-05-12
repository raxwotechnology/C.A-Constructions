const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, getAllUsers, toggleUserStatus, createClient, updateUserByAdmin, verifyPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/verify-password', protect, verifyPassword);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/toggle', protect, authorize('admin'), toggleUserStatus);
router.put('/users/:id', protect, authorize('admin', 'manager'), updateUserByAdmin);
router.post('/clients', protect, authorize('admin', 'manager'), createClient);

module.exports = router;
