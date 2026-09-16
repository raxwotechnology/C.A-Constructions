require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function clearDataKeepLogins() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is missing in .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB!');

    const modelsDir = path.join(__dirname, '../models');
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

    console.log('\n🧹 Clearing operational data while preserving user logins...\n');
    let clearedCollections = 0;
    let totalDeletedRecords = 0;
    let preservedUsersCount = 0;

    for (const file of modelFiles) {
      try {
        const modelPath = path.join(modelsDir, file);
        const model = require(modelPath);

        if (!model || !model.collection) continue;

        const collectionName = model.collection.name;

        // Skip Users collection to preserve all login credentials
        if (collectionName === 'users' || model.modelName === 'User') {
          preservedUsersCount = await model.countDocuments();
          console.log(`🔒 PRESERVED: Users / Logins (${preservedUsersCount} accounts kept active)`);
          continue;
        }

        const count = await model.countDocuments();
        if (count > 0) {
          await model.deleteMany({});
          console.log(`🗑️ Cleared: ${collectionName} (${count} records deleted)`);
          clearedCollections++;
          totalDeletedRecords += count;
        }
      } catch (err) {
        // Ignore single model require issues if optional
      }
    }

    console.log(`\n==============================================`);
    console.log(`✨ DATABASE CLEANUP SUCCESSFUL!`);
    console.log(`   - Preserved Logins: ${preservedUsersCount} User accounts`);
    console.log(`   - Cleared Collections: ${clearedCollections} operational collections`);
    console.log(`   - Total Deleted Records: ${totalDeletedRecords}`);
    console.log(`==============================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  }
}

clearDataKeepLogins();
