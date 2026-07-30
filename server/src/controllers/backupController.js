const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Trigger manual database backup export (JSON dump of core collections)
 */
const exportDatabaseBackup = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `RA_Constructions_Backup_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};

    for (const col of collections) {
      const name = col.name;
      backupData[name] = await mongoose.connection.db.collection(name).find({}).toArray();
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));

    return res.status(200).json({
      success: true,
      message: 'MongoDB Database Backup created successfully',
      backupFile: backupFileName,
      timestamp: new Date().toISOString(),
      collectionsCount: Object.keys(backupData).length
    });
  } catch (error) {
    console.error('Backup Export Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create database backup', error: error.message });
  }
};

/**
 * List available system backups
 */
const listBackups = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          fileName: f,
          sizeBytes: stat.size,
          createdAt: stat.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({ success: true, backups: files });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { exportDatabaseBackup, listBackups };
