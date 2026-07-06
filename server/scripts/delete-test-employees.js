/**
 * One-time script to permanently delete the test employees and their linked user accounts.
 * Run: node server/scripts/delete-test-employees.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const EMPLOYEE_EMAILS = [
  'john@raxwo.com',
  'nimal@raxwo.com',
  'designer@raxwo.com',
  'marketing@raxwo.com',
];

const EMP_NOS = ['EMP0015', 'EMP0016', 'EMP0017', 'EMP0018'];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Employee = require('../src/models/Employee');
  const User = require('../src/models/User');

  // Find by email OR employee number
  const employees = await Employee.find({
    $or: [
      { employeeId: { $in: EMP_NOS } },
    ]
  });

  console.log(`Found ${employees.length} employee(s) to delete:`);
  employees.forEach(e => console.log(`  - ${e.name} (${e.employeeId}) | userId: ${e.userId}`));

  // Collect user IDs linked to these employees
  const userIds = employees.map(e => e.userId).filter(Boolean);

  // Delete employees
  const empResult = await Employee.deleteMany({
    $or: [
      { employeeId: { $in: EMP_NOS } },
    ]
  });
  console.log(`🗑️  Deleted ${empResult.deletedCount} employee record(s)`);

  // Delete linked user accounts (by email as well)
  const userResult = await User.deleteMany({
    $or: [
      { _id: { $in: userIds } },
      { email: { $in: EMPLOYEE_EMAILS } },
    ]
  });
  console.log(`🗑️  Deleted ${userResult.deletedCount} user account(s)`);

  // Double check
  const remaining = await Employee.countDocuments({ employeeId: { $in: EMP_NOS } });
  console.log(`✅ Remaining employees with those IDs: ${remaining}`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
