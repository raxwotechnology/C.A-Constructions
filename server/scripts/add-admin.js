/**
 * Upsert admin account: management@raxwo.net / Admin@2026
 * Run: node server/scripts/add-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'management@raxwo.net';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role}). Updating password & ensuring admin role...`);
    existing.password = 'Admin@2026';   // pre-save hook will hash it
    existing.role = 'admin';
    existing.isActive = true;
    existing.name = existing.name || 'Management';
    await existing.save();
    console.log(`✅ Updated: ${email} — password reset to Admin@2026, role set to admin`);
  } else {
    await User.create({
      name: 'Management',
      email,
      password: 'Admin@2026',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });
    console.log(`✅ Created: ${email} / Admin@2026 (role: admin)`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
