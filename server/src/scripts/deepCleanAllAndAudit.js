require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function deepCleanAllAndAudit() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is missing in .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    console.log(`✅ Connected to MongoDB Database: "${db.databaseName}"`);

    // List ALL collections directly from MongoDB engine
    const rawCollections = await db.listCollections().toArray();
    console.log(`\n🔍 Found ${rawCollections.length} total collections in database.\n`);

    const auditRecords = [];
    let totalDeletedCount = 0;
    let preservedUsersCount = 0;
    let clearedCollectionsCount = 0;

    for (const colInfo of rawCollections) {
      const colName = colInfo.name;
      const collection = db.collection(colName);
      const countBefore = await collection.countDocuments();

      if (colName === 'users') {
        preservedUsersCount = countBefore;
        auditRecords.push({
          collection: colName,
          before: countBefore,
          after: countBefore,
          deleted: 0,
          status: '🔒 PRESERVED (User Logins & Credentials Intact)'
        });
        console.log(`🔒 PRESERVED: "${colName}" (${countBefore} user accounts kept intact)`);
      } else {
        if (countBefore > 0) {
          await collection.deleteMany({});
          totalDeletedCount += countBefore;
          clearedCollectionsCount++;
        }
        const countAfter = await collection.countDocuments();

        auditRecords.push({
          collection: colName,
          before: countBefore,
          after: countAfter,
          deleted: countBefore - countAfter,
          status: countBefore > 0 ? '🗑️ CLEARED (Wiped Clean)' : '✅ EMPTY (0 Records)'
        });

        console.log(`🗑️ Cleared: "${colName}" (Deleted ${countBefore} records -> ${countAfter} left)`);
      }
    }

    // Generate Markdown Audit Log Content
    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

    let markdownContent = `# 🛡️ Complete Database Cleanup & Audit Log Report\n\n`;
    markdownContent += `> [!IMPORTANT]\n`;
    markdownContent += `> **Audit Execution Date**: ${formattedDate} (UTC: ${timestamp})\n`;
    markdownContent += `> **Database Name**: \`${db.databaseName}\`\n`;
    markdownContent += `> **Preserved User Logins**: **${preservedUsersCount} Active Accounts**\n`;
    markdownContent += `> **Total Cleared Collections**: **${clearedCollectionsCount} Collections**\n`;
    markdownContent += `> **Total Records Deleted**: **${totalDeletedCount} Records**\n\n`;

    markdownContent += `## 📋 Collection-by-Collection Audit Summary\n\n`;
    markdownContent += `| Collection Name | Records Before | Records Deleted | Records After | Status |\n`;
    markdownContent += `| :--- | :---: | :---: | :---: | :--- |\n`;

    for (const rec of auditRecords) {
      markdownContent += `| \`${rec.collection}\` | ${rec.before} | ${rec.deleted} | ${rec.after} | ${rec.status} |\n`;
    }

    markdownContent += `\n\n## 🔐 Preserved User Login Accounts\n\n`;
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    markdownContent += `| Account Name | Email Address | Role | Status |\n`;
    markdownContent += `| :--- | :--- | :--- | :--- |\n`;
    for (const u of users) {
      markdownContent += `| **${u.name || 'N/A'}** | \`${u.email || 'N/A'}\` | \`${u.role || 'user'}\` | ${u.isActive ? '🟢 Active' : '🔴 Inactive'} |\n`;
    }

    markdownContent += `\n\n---\n*Audit Log generated automatically by Antigravity Database Maintenance System.*`;

    // Save Audit Log to Artifact Directory
    const artifactPath = `C:\\Users\\DilumVD\\.gemini\\antigravity\\brain\\35373c81-0ccc-441a-b737-754eb2a70290\\audit_log_database_cleanup.md`;
    fs.writeFileSync(artifactPath, markdownContent, 'utf8');
    console.log(`\n📄 Audit Log Report written to: ${artifactPath}`);

    console.log(`\n==============================================`);
    console.log(`✨ ALL COLLECTIONS DEEP CLEANED & AUDITED!`);
    console.log(`   - Preserved Logins: ${preservedUsersCount} User Accounts`);
    console.log(`   - Total Collections Audited: ${rawCollections.length}`);
    console.log(`   - Total Deleted Records: ${totalDeletedCount}`);
    console.log(`==============================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during deep clean & audit:', error);
    process.exit(1);
  }
}

deepCleanAllAndAudit();
