require('dotenv').config();
const mongoose = require('mongoose');

async function absoluteZeroClean() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI missing in .env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    console.log(`✅ Connected to Database: "${db.databaseName}"`);

    const collections = await db.listCollections().toArray();
    console.log(`\n🧹 Executing Absolute Zero Wipe across ${collections.length} collections (Keeping Logins only)...\n`);

    let totalDeleted = 0;
    let usersPreserved = 0;

    for (const col of collections) {
      const name = col.name;
      const collection = db.collection(name);

      if (name === 'users') {
        usersPreserved = await collection.countDocuments();
        console.log(`🔒 Preserved: "users" (${usersPreserved} login accounts active)`);
      } else {
        const count = await collection.countDocuments();
        if (count > 0) {
          const res = await collection.deleteMany({});
          totalDeleted += res.deletedCount || count;
          console.log(`🗑️ Wiped: "${name}" (${res.deletedCount || count} deleted -> now 0)`);
        } else {
          console.log(`✅ Clean: "${name}" (0 records)`);
        }
      }
    }

    console.log(`\n🔍 Verifying Database Zero State...`);
    let nonZeroCount = 0;

    for (const col of collections) {
      const name = col.name;
      if (name !== 'users') {
        const cnt = await db.collection(name).countDocuments();
        if (cnt > 0) {
          console.error(`⚠️ Non-zero collection detected: "${name}" has ${cnt} records!`);
          nonZeroCount++;
        }
      }
    }

    console.log(`\n==============================================`);
    console.log(`✨ ABSOLUTE ZERO DATABASE WIPE COMPLETE!`);
    console.log(`   - Preserved Logins: ${usersPreserved} User Accounts`);
    console.log(`   - Operational Collections Status: ${nonZeroCount === 0 ? 'ALL 100% ZERO' : `${nonZeroCount} Non-Zero`}`);
    console.log(`   - Total Deleted in this run: ${totalDeleted}`);
    console.log(`==============================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during absolute zero wipe:', err);
    process.exit(1);
  }
}

absoluteZeroClean();
