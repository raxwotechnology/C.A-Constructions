require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Check audit logs for deletes
  const logs = await db.collection('auditlogs').find({ action: 'delete' })
    .sort({ createdAt: -1 }).limit(30).toArray();

  console.log('\n=== RECENT DELETE AUDIT LOGS ===');
  if (!logs.length) console.log('No delete audit logs found.');
  logs.forEach(l => console.log(
    new Date(l.createdAt).toLocaleString(), '|',
    l.module, '|', l.entityName || '?', '|',
    (l.description || '').slice(0, 100)
  ));

  // Check all users in DB
  const users = await db.collection('users').find({}).toArray();
  console.log('\n=== ALL USERS IN DB ===');
  console.log('Total:', users.length);
  const byRole = {};
  users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
  console.log('By role:', byRole);
  users.forEach(u => console.log(' -', u.role.padEnd(12), u.email, '|', u.name));

  await mongoose.disconnect();
  process.exit(0);
});
