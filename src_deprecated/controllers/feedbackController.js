const Feedback = require('../models/Feedback');

exports.submitFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.create({
      ...req.body,
      client: req.user._id,
    });
    res.status(201).json({ success: true, feedback });
  } catch (err) { next(err); }
};

exports.getFeedbacks = async (req, res, next) => {
  try {
    const query = req.user.role === 'client' ? { client: req.user._id } : {};
    const feedbacks = await Feedback.find(query)
      .populate('client', 'name email')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (err) { next(err); }
};

exports.getPublicFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({})
      .populate('client', 'name avatar')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (err) { next(err); }
};

exports.reactFeedback = async (req, res, next) => {
  try {
    const { action } = req.body; // like | dislike
    if (!['like', 'dislike'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction action' });
    }
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    const userId = String(req.user._id);
    const likedSet = new Set((feedback.likedBy || []).map((x) => String(x)));
    const dislikedSet = new Set((feedback.dislikedBy || []).map((x) => String(x)));

    if (action === 'like') {
      likedSet.add(userId);
      dislikedSet.delete(userId);
    } else {
      dislikedSet.add(userId);
      likedSet.delete(userId);
    }

    feedback.likedBy = Array.from(likedSet);
    feedback.dislikedBy = Array.from(dislikedSet);
    feedback.likes = feedback.likedBy.length;
    feedback.dislikes = feedback.dislikedBy.length;
    await feedback.save();

    res.json({
      success: true,
      reaction: {
        likes: feedback.likes,
        dislikes: feedback.dislikes,
        liked: likedSet.has(userId),
        disliked: dislikedSet.has(userId),
      },
      feedback,
    });
  } catch (err) { next(err); }
};

exports.respondFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { response: req.body.response || '', status: req.body.status || 'reviewed' },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, feedback });
  } catch (err) { next(err); }
};
