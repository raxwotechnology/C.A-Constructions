/**
 * Ensures one login per staff role (excludes admin & client).
 * Creates missing users or resets password to the known demo value.
 * Run: node src/scripts/ensureRoleLogins.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

const STAFF_ROLES = [
  { role: 'manager', name: 'Sarah Manager', email: 'manager@raxwo.com', password: 'Manager@2026', department: 'Operations', designation: 'Operations Manager' },
  { role: 'developer', name: 'John Developer', email: 'developer@raxwo.com', password: 'Developer@2026', department: 'Engineering', designation: 'Software Developer' },
  { role: 'designer', name: 'Alex Designer', email: 'designer@raxwo.com', password: 'Designer@2026', department: 'Design', designation: 'UI/UX Designer' },
  { role: 'marketing', name: 'Maya Marketing', email: 'marketing@raxwo.com', password: 'Marketing@2026', department: 'Marketing', designation: 'Marketing Executive' },
];

async function ensureEmployeeProfile(user, spec) {
  const existing = await Employee.findOne({ userId: user._id });
  if (existing) return existing;
  const count = await Employee.countDocuments();
  return Employee.create({
    userId: user._id,
    employeeNo: `EMP${String(count + 1).padStart(4, '0')}`,
    department: spec.department,
    designation: spec.designation,
    basicSalary: 100000,
    allowances: 10000,
    joinedDate: new Date(),
    status: 'active',
    gender: 'male',
  });
}

async function upsertRoleUser(spec) {
  let user = await User.findOne({ email: spec.email });
  if (!user) {
    user = await User.create({
      name: spec.name,
      email: spec.email,
      password: spec.password,
      role: spec.role,
      isActive: true,
    });
    console.log(`  + Created ${spec.role}: ${spec.email}`);
  } else {
    user.password = spec.password;
    user.role = spec.role;
    user.isActive = true;
    if (!user.name) user.name = spec.name;
    await user.save();
    console.log(`  ~ Updated password for ${spec.email} (${spec.role})`);
  }
  if (['developer', 'designer', 'marketing', 'manager'].includes(spec.role)) {
    await ensureEmployeeProfile(user, spec);
  }
  return user;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  const allRoles = ['admin', 'manager', 'developer', 'designer', 'marketing', 'client'];
  console.log('=== Roles in this project (User model) ===');
  allRoles.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  console.log(`  Total: ${allRoles.length} roles\n`);

  console.log('=== Ensuring staff demo logins (not admin/client) ===');
  for (const spec of STAFF_ROLES) {
    await upsertRoleUser(spec);
  }

  console.log('\n=== All users in database (by role) ===');
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

  console.log('\n=== Demo login credentials (staff only) ===');
  for (const spec of STAFF_ROLES) {
    console.log(`  ${spec.role.padEnd(10)} ${spec.email.padEnd(22)} ${spec.password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
