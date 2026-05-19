const SiteSetting = require('../models/SiteSetting');
const { toRelativeUploadUrl } = require('../utils/uploadsPath');

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create({});
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
