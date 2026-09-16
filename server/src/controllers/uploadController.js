const { relativeUploadPath } = require('../utils/uploadsPath');

exports.uploadImageFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    let imageUrl;
    if (req.file.filename && req.file.filename.startsWith('data:')) {
      imageUrl = req.file.filename;
    } else {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${b64}`;
    }
    res.status(201).json({ success: true, imageUrl });
  } catch (err) { next(err); }
};
