exports.uploadImageFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;
    res.status(201).json({ success: true, imageUrl });
  } catch (err) { next(err); }
};

