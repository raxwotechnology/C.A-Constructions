const User = require('../models/User');

/**
 * Re-verify password before destructive actions.
 * @param {string} userId - Current user ID
 * @param {string} password - Password string to test
 * @param {boolean} requireAdmin - If true, password must match an Admin user account
 */
async function verifyActionPassword(userId, password, requireAdmin = false) {
  if (password == null || typeof password !== 'string' || !password.trim()) {
    return { ok: false, status: 400, message: 'Admin Password required to confirm deletion' };
  }

  // First try verifying current user's password
  const currentUser = await User.findById(userId).select('+password +role');
  if (currentUser) {
    const isCurrentAdmin = ['admin', 'Admin', 'ceo', 'CEO'].includes(currentUser.role);
    if ((!requireAdmin || isCurrentAdmin) && (await currentUser.matchPassword(password))) {
      return { ok: true, verifiedUser: currentUser };
    }
  }

  // If requireAdmin is true or current user is non-admin, test against any Admin user's password
  const adminUsers = await User.find({ role: { $in: ['admin', 'Admin', 'ceo', 'CEO'] }, isActive: true }).select('+password +role +name');
  for (const admin of adminUsers) {
    if (await admin.matchPassword(password)) {
      return { ok: true, verifiedUser: admin };
    }
  }

  return { ok: false, status: 401, message: 'Invalid Admin Password! Deletion denied.' };
}

module.exports = { verifyActionPassword };
