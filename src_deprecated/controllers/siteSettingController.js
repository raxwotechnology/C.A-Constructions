const SiteSetting = require('../models/SiteSetting');

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create({});
    res.json({ success: true, settings });
  } catch (err) { next(err); }
};

exports.updateSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) settings = await SiteSetting.create(req.body);
    else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (err) { next(err); }
};
