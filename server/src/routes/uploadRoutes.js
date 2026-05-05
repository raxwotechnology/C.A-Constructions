const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadImageLocal } = require('../middleware/upload');
const { uploadImageFile } = require('../controllers/uploadController');

router.post('/image', protect, (req, res, next) => {
  uploadImageLocal(req, res, (err) => {
    if (err) return next(err);
    return uploadImageFile(req, res, next);
  });
});

module.exports = router;

