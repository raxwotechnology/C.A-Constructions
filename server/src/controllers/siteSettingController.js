const SiteSetting = require('../models/SiteSetting');
const { toRelativeUploadUrl } = require('../utils/uploadsPath');

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create({});
    const plain = settings.toObject ? settings.toObject() : settings;
    if (plain.logoUrl) plain.logoUrl = toRelativeUploadUrl(plain.logoUrl);
    res.json({ success: true, settings: plain });
  } catch (err) { next(err); }
};

exports.updateSiteSettings = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if ('logoUrl' in body) {
      const raw = String(body.logoUrl || '').trim();
      body.logoUrl = raw ? toRelativeUploadUrl(raw) : '';
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
