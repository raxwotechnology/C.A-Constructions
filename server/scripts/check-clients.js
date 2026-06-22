/**
 * Shows all ClientProfile documents — helps identify clients that lost their User account.
 * Run: node scripts/check-clients.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const profiles = await db.collection('clientprofiles').find({}).toArray();
  console.log('\n=== CLIENT PROFILES IN DB ===', profiles.length);
  profiles.forEach(p => console.log(' -', p._id, '| company:', p.companyName, '| user:', p.user));

  const subs = await db.collection('subscriptions').find({}).toArray();
  console.log('\n=== SUBSCRIPTIONS ===', subs.length);
  subs.forEach(s => console.log(' -', s.subscriptionNo, '| client:', s.client, '| title:', s.title));

  await mongoose.disconnect();
  process.exit(0);
});
