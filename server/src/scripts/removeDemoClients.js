require('dotenv').config();
const mongoose = require('mongoose');

async function removeDemoClients() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const namesToDelete = [
      'Dr. Ruwan Perera',
      'Nihal Jayasinghe',
      'Apex Holdings (Pvt) Ltd',
      'gg',
      'NAYOMI',
      'kamala',
      'sithumini',
      'test',
      'test123'
    ];

    const res = await db.collection('users').deleteMany({
      $or: [
        { name: { $in: namesToDelete } },
        { email: { $regex: /client\.local|test@|test123@/i } }
      ]
    });

    console.log(`🗑️ Removed ${res.deletedCount} demo/test client accounts from users collection.`);
    const remaining = await db.collection('users').countDocuments();
    console.log(`🔒 Remaining Active Core Logins: ${remaining}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

removeDemoClients();
