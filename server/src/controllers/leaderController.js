const Leader = require('../models/Leader');
const path = require('path');
const fs = require('fs');
const { uploadSubdir } = require('../utils/uploadsPath');

const getImageUrl = (req, filename) => {
  if (!filename) return '';
  if (filename.startsWith('data:')) return filename;
  return `${req.protocol}://${req.get('host')}/uploads/leaders/${filename}`;
};

exports.getLeaders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user?.role !== 'admin') filter.active = true;
    const leaders = await Leader.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, leaders });
  } catch (err) { next(err); }
};

exports.createLeader = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.imageUrl = getImageUrl(req, req.file.filename);
    }
    const leader = await Leader.create(body);
    res.status(201).json({ success: true, leader });
  } catch (err) { next(err); }
};

exports.updateLeader = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.imageUrl = getImageUrl(req, req.file.filename);
      // delete old image file if it exists
      const existing = await Leader.findById(req.params.id);
      if (existing?.imageUrl) {
        const oldFile = existing.imageUrl.split('/uploads/leaders/')[1];
        if (oldFile) {
          const oldPath = path.join(uploadSubdir('leaders'), oldFile);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }
    }
    const leader = await Leader.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!leader) return res.status(404).json({ success: false, message: 'Leader not found' });
    res.json({ success: true, leader });
  } catch (err) { next(err); }
};

exports.deleteLeader = async (req, res, next) => {
  try {
    const leader = await Leader.findByIdAndDelete(req.params.id);
    if (!leader) return res.status(404).json({ success: false, message: 'Leader not found' });
    // delete image file
    if (leader.imageUrl) {
      const filename = leader.imageUrl.split('/uploads/leaders/')[1];
      if (filename) {
        const filePath = path.join(uploadSubdir('leaders'), filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true, message: 'Leader deleted' });
  } catch (err) { next(err); }
};
