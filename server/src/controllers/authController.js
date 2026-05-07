const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getOrCreateReward, awardPoints, handleReferralForNewClient } = require('../services/rewardService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, referralCode } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Only admin can create admin/manager accounts
    const allowedRole = ['admin', 'manager'].includes(role) ? (req.user?.role === 'admin' ? role : 'developer') : (role || 'developer');
    const user = await User.create({ name, email, password, role: allowedRole });
    if (allowedRole === 'client') {
      await getOrCreateReward(user._id);
      await awardPoints({
        userId: user._id,
        action: 'register_account',
        sourceKey: `register:${user._id}`,
        note: 'Account registration reward',
      });
      if (referralCode) await handleReferralForNewClient({ newUserId: user._id, referralCode });
    }
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) { next(err); }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated' });

    const prevLastLogin = user.lastLogin;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    if (user.role === 'client') {
      await getOrCreateReward(user._id);
      const prev = prevLastLogin ? new Date(prevLastLogin) : null;
      const now = new Date();
      const sameMonth = prev && prev.getMonth() === now.getMonth() && prev.getFullYear() === now.getFullYear();
      if (!sameMonth) {
        await awardPoints({
          userId: user._id,
          action: 'monthly_active_usage',
          sourceKey: `monthly-active:${user._id}:${now.getFullYear()}-${now.getMonth() + 1}`,
          note: 'Monthly active usage reward',
        });
      }
    }

    const token = generateToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) { next(err); }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, avatar }, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

// @desc    Get all users (admin)
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// @desc    Toggle user status (admin)
// @route   PUT /api/auth/users/:id/toggle
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { next(err); }
};

// @desc    Update user profile (admin/manager)
// @route   PUT /api/auth/users/:id
exports.updateUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, isActive, role } = req.body;
    const payload = {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(role !== undefined ? { role } : {}),
    };
    const user = await User.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @desc    Create client account (admin)
// @route   POST /api/auth/clients
exports.createClient = async (req, res, next) => {
  try {
    const { name, email, phone, password, referralCode } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password: password || 'Client@2026',
      role: 'client',
    });
    await getOrCreateReward(user._id);
    await awardPoints({
      userId: user._id,
      action: 'register_account',
      sourceKey: `register:${user._id}`,
      note: 'Account registration reward',
    });
    if (referralCode) await handleReferralForNewClient({ newUserId: user._id, referralCode });
    res.status(201).json({ success: true, user });
  } catch (err) { next(err); }
};
