const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadLogo } = require('../middleware/upload.middleware');
const path = require('path');
const fs = require('fs');

// Get company settings (PUBLIC)
router.get('/', async (req, res) => {
  const settingsFile = path.join(__dirname, '../../uploads/settings.json');
  try {
    const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : { companyName: 'Raxwo Technologies', logo: null };
    res.json({ success: true, data: settings });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Update logo
router.post('/logo', protect, authorize('admin'), uploadLogo, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No logo uploaded' });
    const settingsFile = path.join(__dirname, '../../uploads/settings.json');
    const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
    settings.logo = `logos/${req.file.filename}`;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
    res.json({ success: true, message: 'Logo updated', logo: settings.logo });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Update general settings
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    const settingsFile = path.join(__dirname, '../../uploads/settings.json');
    const existing = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
    const updated = { ...existing, ...req.body };
    fs.writeFileSync(settingsFile, JSON.stringify(updated));
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
