/**
 * One-time script to update the admin user's email to management@raxwo.net
 * Usage: node src/scripts/updateAdminEmail.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find the admin user
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.log('No admin user found!');
    process.exit(1);
  }

  console.log(`Current admin email: ${admin.email}`);
  
  const newEmail = 'management@raxwo.net';
  
  // Check if the new email is already used by another user
  const existing = await User.findOne({ email: newEmail, _id: { $ne: admin._id } });
  if (existing) {
    console.log(`Email ${newEmail} is already used by another user (${existing.name}, role: ${existing.role}). Aborting.`);
    process.exit(1);
  }

  admin.email = newEmail;
  await admin.save({ validateBeforeSave: false });
  
  console.log(`✅ Admin email updated to: ${admin.email}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
