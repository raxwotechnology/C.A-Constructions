const User = require('../models/User.model');
const { generateToken } = require('../middleware/auth.middleware');
const { validationResult } = require('express-validator');

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, password } = req.body;

    // Find user by phone — include password for comparison
    const user = await User.findOne({ phone: phone.trim(), isActive: true }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Register new user (admin only for employees, public for customers)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, phone, password, userType = 'customer', dateOfBirth } = req.body;

    // Check duplicate
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Phone number';
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }

    const user = await User.create({ fullName, email, phone, password, userType, dateOfBirth });

    const token = generateToken(user._id);
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, email, dateOfBirth } = req.body;
    
    // Check if phone or email is already taken by another user
    const exists = await User.findOne({
      $or: [{ email }, { phone }],
      _id: { $ne: req.user._id }
    });
    
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email or phone already in use by another account' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, email, dateOfBirth },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
