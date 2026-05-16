/**
 * Creates missing staff demo users or resets passwords to seed values.
 * Run: npm run ensure-role-logins
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ensureStaffLogins, STAFF_SPECS } = require('../services/ensureStaffLogins');

async function connect() {
  const primary = process.env.MONGO_URI;
  const fallback = process.env.MONGO_URI_FALLBACK;
  try {
    await mongoose.connect(primary);
    return primary;
  } catch (e) {
    if (fallback && String(e.message || '').includes('querySrv')) {
      await mongoose.connect(fallback);
      return fallback;
    }
    throw e;
  }
}

async function main() {
  await connect();
  console.log('Connected.\n');

  const allRoles = ['admin', 'manager', 'developer', 'designer', 'marketing', 'client'];
  console.log('=== Roles in this project ===');
  allRoles.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));

  console.log('\n=== Ensuring staff demo logins (reset passwords) ===');
  await ensureStaffLogins({ resetPassword: true });

  console.log('\n=== All users (by role) ===');
  const users = await User.find({}).select('name email role isActive').sort({ role: 1, email: 1 }).lean();
  const byRole = {};
  for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  }
  for (const role of allRoles) {
    const list = byRole[role] || [];
    console.log(`\n${role} (${list.length}):`);
    if (!list.length) console.log('  (none)');
    else list.forEach((u) => console.log(`  - ${u.email} | ${u.name} | active=${u.isActive}`));
  }

  console.log('\n=== Demo credentials (staff) ===');
  for (const spec of STAFF_SPECS) {
    console.log(`  ${spec.role.padEnd(10)} ${spec.email.padEnd(22)} ${spec.password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
