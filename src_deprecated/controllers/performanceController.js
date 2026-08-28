const Performance = require('../models/Performance');

exports.upsertPerformance = async (req, res, next) => {
  try {
    const { developer, month, year, tasksCompleted = 0, commits = 0, codeQuality = 0, collaboration = 0, project, notes = '' } = req.body;
    const score = Math.round((Number(tasksCompleted) * 0.35) + (Number(commits) * 0.2) + (Number(codeQuality) * 0.3) + (Number(collaboration) * 0.15));
    const record = await Performance.findOneAndUpdate(
      { developer, month, year },
      { developer, month, year, tasksCompleted, commits, codeQuality, collaboration, score, project, notes },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, record });
  } catch (err) { next(err); }
};

exports.getPerformance = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.developer) query.developer = req.query.developer;
    if (req.query.month) query.month = Number(req.query.month);
    if (req.query.year) query.year = Number(req.query.year);
    const records = await Performance.find(query)
      .populate('developer', 'name email role')
      .populate('project', 'title status')
      .sort({ year: -1, month: -1, score: -1 });
    res.json({ success: true, count: records.length, records });
  } catch (err) { next(err); }
};
