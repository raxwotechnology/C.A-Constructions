require('dotenv').config();
const mongoose = require('mongoose');

async function cleanDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB:", mongoose.connection.name);

    // 1. Drop unwanted databases
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    
    for (const dbInfo of dbs.databases) {
      if (['raxwo', 'raxwo_mern'].includes(dbInfo.name)) {
        console.log(`Dropping database: ${dbInfo.name}...`);
        const dbToDrop = mongoose.connection.client.db(dbInfo.name);
        await dbToDrop.dropDatabase();
        console.log(`Successfully dropped ${dbInfo.name}`);
      }
    }

    // 2. Clean collections in current DB (raxwo_db)
    const collectionsToKeep = ['users', 'invoices', 'quotations'];
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const collection of collections) {
      if (!collectionsToKeep.includes(collection.name)) {
        console.log(`Dropping collection: ${collection.name}...`);
        await mongoose.connection.db.dropCollection(collection.name);
      }
    }

    // 3. Keep only admin in users collection
    const User = require('../src/models/User');
    const deleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${deleteResult.deletedCount} non-admin users.`);

    console.log("Database cleanup completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanDB();
