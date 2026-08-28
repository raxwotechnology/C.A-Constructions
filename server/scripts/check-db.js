require('dotenv').config();
const mongoose = require('mongoose');

async function checkDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);
  
  // List all databases
  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log("Databases:");
  dbs.databases.forEach(db => console.log(` - ${db.name}`));

  // List collections in current DB
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("\nCollections in current DB:");
  collections.forEach(c => console.log(` - ${c.name}`));

  const User = require('../src/models/User');
  const users = await User.find({}, 'name email role');
  console.log("\nUsers:");
  console.log(users);

  process.exit(0);
}

checkDB().catch(console.error);
