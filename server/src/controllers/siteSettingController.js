const SiteSetting = require('../models/SiteSetting');
const { toRelativeUploadUrl } = require('../utils/uploadsPath');

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create({});
    res.json({ success: true, settings });
  } catch (err) { next(err); }
};

exports.updateSiteSettings = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.logoUrl != null && body.logoUrl !== '') {
      body.logoUrl = toRelativeUploadUrl(body.logoUrl);
    }
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create(body);
    else {
      Object.assign(settings, body);
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (err) { next(err); }
};
