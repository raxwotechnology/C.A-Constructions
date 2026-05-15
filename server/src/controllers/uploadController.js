const { relativeUploadPath } = require('../utils/uploadsPath');

exports.uploadImageFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const imageUrl = relativeUploadPath('images', req.file.filename);
    res.status(201).json({ success: true, imageUrl });
  } catch (err) { next(err); }
};
