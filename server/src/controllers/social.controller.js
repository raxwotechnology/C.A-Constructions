const SocialPost = require('../models/SocialPost.model');

exports.getPosts = async (req, res) => {
  try {
    const { status, platform, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SocialPost.countDocuments(filter);
    const posts = await SocialPost.find(filter).populate('createdBy', 'fullName').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
    res.json({ success: true, data: posts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createPost = async (req, res) => {
  try {
    const postData = { ...req.body, createdBy: req.user._id };
    if (req.files && req.files.length > 0) postData.media = req.files.map(f => `social_media/${f.filename}`);
    const post = await SocialPost.create(postData);
    res.status(201).json({ success: true, message: 'Post created', data: post });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updatePost = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.files && req.files.length > 0) updates.media = req.files.map(f => `social_media/${f.filename}`);
    const post = await SocialPost.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deletePost = async (req, res) => {
  try {
    await SocialPost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.publishPost = async (req, res) => {
  try {
    const post = await SocialPost.findByIdAndUpdate(req.params.id, { status: 'published', publishedAt: new Date() }, { new: true });
    res.json({ success: true, message: 'Post published', data: post });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
