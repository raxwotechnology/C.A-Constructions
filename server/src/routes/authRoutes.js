const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile, changePassword, resetPassword,
  sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPasswordWithOtp,
  getAllUsers, toggleUserStatus, createClient, updateUserByAdmin, adminSetUserPassword, verifyPassword, deleteUserByAdmin,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/forgot-password/otp', sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/verify-password', protect, verifyPassword);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/toggle', protect, authorize('admin'), toggleUserStatus);
router.put('/users/:id', protect, authorize('admin', 'manager'), updateUserByAdmin);
router.put('/users/:id/password', protect, authorize('admin', 'manager'), adminSetUserPassword);
router.delete('/users/:id', protect, authorize('admin'), deleteUserByAdmin);
router.post('/clients', protect, authorize('admin', 'manager'), createClient);

module.exports = router;
