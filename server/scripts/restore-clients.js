/**
 * Restore client User accounts from orphaned ClientProfile documents.
 * For each profile with no linked user, a new User is created with a
 * temporary password (ClientPass@2026) and linked back to the profile.
 *
 * Run: node scripts/restore-clients.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Slug helper — converts company name to an email-safe string
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

  const profiles = await db.collection('clientprofiles').find({}).toArray();
  console.log(`Found ${profiles.length} client profile(s). Restoring user accounts...\n`);

  for (const p of profiles) {
    const company = p.companyName || 'Client';
    const email = `${slug(company)}@client.raxwo.net`;
    const tempPassword = 'ClientPass@2026';

    // Check if a user with this email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      // Just relink the profile
      await db.collection('clientprofiles').updateOne({ _id: p._id }, { $set: { user: existing._id } });
      console.log(`ℹ️  User already exists for ${company}: ${email} — relinked profile.`);
      continue;
    }

    // Create new user
    const newUser = await User.create({
      name: company,
      email,
      password: tempPassword,
      role: 'client',
      isActive: true,
      isEmailVerified: false,
    });

    // Relink profile
    await db.collection('clientprofiles').updateOne(
      { _id: p._id },
      { $set: { user: newUser._id } }
    );

    console.log(`✅ Restored: ${company}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${tempPassword}  ← CHANGE THIS after logging in\n`);
  }

  console.log('\n✅ All client accounts restored!');
  console.log('⚠️  Please update the passwords for each client from the Admin > Clients page.');
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
