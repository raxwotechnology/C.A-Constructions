const User = require('../models/User');

/**
 * Re-verify the authenticated user's password before destructive or sensitive mutations.
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
async function verifyActionPassword(userId, password) {
  if (password == null || typeof password !== 'string' || !password.trim()) {
    return { ok: false, status: 400, message: 'Password required to confirm this action' };
  }
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return { ok: false, status: 401, message: 'Invalid password' };
  }
  return { ok: true };
}

module.exports = { verifyActionPassword };
