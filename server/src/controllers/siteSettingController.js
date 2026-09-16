const path = require('path');
const fs = require('fs');
const SiteSetting = require('../models/SiteSetting');
const { toRelativeUploadUrl } = require('../utils/uploadsPath');

exports.getSiteLogo = async (req, res, next) => {
  try {
    const settings = await SiteSetting.findOne();
    if (settings && settings.logoUrl) {
      const rawLogo = settings.logoUrl.trim();
      if (rawLogo.startsWith('data:image/')) {
        const matches = rawLogo.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const imgBuffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(imgBuffer);
        }
      }
      if (rawLogo.startsWith('/uploads/') || rawLogo.startsWith('uploads/')) {
        const relativePath = rawLogo.startsWith('/') ? rawLogo.substring(1) : rawLogo;
        const fullPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.sendFile(fullPath);
        }
      }
      if (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) {
        return res.redirect(rawLogo);
      }
    }
    const fallbackPath = path.join(process.cwd(), 'client/public/favicon.png');
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }
    res.status(404).send('Logo not found');
  } catch (err) { next(err); }
};

exports.downloadDatabase = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const dbDump = {};
    for (const modelName of Object.keys(mongoose.models)) {
      dbDump[modelName] = await mongoose.models[modelName].find({});
    }
    res.setHeader('Content-disposition', 'attachment; filename=raxwo_db_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(dbDump, null, 2));
  } catch (err) { next(err); }
};

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create({});
    } else {
      let changed = false;
      if (!settings.siteName || settings.siteName === 'Raxwo Pvt Ltd') { settings.siteName = 'R A Creations & Home Designs'; changed = true; }
      if (!settings.contactEmail) { settings.contactEmail = 'racreationshd@gmail.com'; changed = true; }
      if (!settings.contactPhone) { settings.contactPhone = '0770749690'; changed = true; }
      if (!settings.websiteUrl) { settings.websiteUrl = 'www.rach.lk'; changed = true; }
      if (!settings.letterheadTagline || settings.letterheadTagline === 'Next Level Tech') { settings.letterheadTagline = 'Construction & Home Designs'; changed = true; }
      if (!settings.whatsappNumber) { settings.whatsappNumber = '0770749690'; changed = true; }
      if (!settings.adminEmail) { settings.adminEmail = 'racreationshd@gmail.com'; changed = true; }
      if (changed) await settings.save();
    }
    const plain = settings.toObject ? settings.toObject() : settings;
    if (plain.logoUrl) plain.logoUrl = toRelativeUploadUrl(plain.logoUrl);
    if (plain.sealUrl) plain.sealUrl = toRelativeUploadUrl(plain.sealUrl);
    if (plain.letterheadUrl) plain.letterheadUrl = toRelativeUploadUrl(plain.letterheadUrl);
    const sigs = plain.signatures || {};
    ['hr', 'admin', 'manager'].forEach((k) => {
      if (sigs[k]?.url) sigs[k].url = toRelativeUploadUrl(sigs[k].url);
    });
    plain.signatures = sigs;
    res.json({ success: true, settings: plain });
  } catch (err) { next(err); }
};

exports.updateSiteSettings = async (req, res, next) => {
  try {
    const body = { ...req.body };
    const normalizeUrl = (key) => {
      if (!(key in body)) return;
      const raw = String(body[key] || '').trim();
      body[key] = raw ? toRelativeUploadUrl(raw) : '';
    };
    normalizeUrl('logoUrl');
    normalizeUrl('sealUrl');
    normalizeUrl('letterheadUrl');
    if (body.signatures && typeof body.signatures === 'object') {
      ['hr', 'admin', 'manager'].forEach((k) => {
        if (body.signatures[k]?.url != null) {
          const raw = String(body.signatures[k].url || '').trim();
          body.signatures[k].url = raw ? toRelativeUploadUrl(raw) : '';
        }
      });
    }
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create(body);
    } else {
      Object.assign(settings, body);
      if ('logoUrl' in body && !String(body.logoUrl || '').trim()) {
        settings.logoUrl = '';
        settings.markModified('logoUrl');
      }
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (err) { next(err); }
};

