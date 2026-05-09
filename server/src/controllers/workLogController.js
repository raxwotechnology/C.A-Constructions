const WorkLog = require('../models/WorkLog');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const { createNotification } = require('../services/notificationService');

exports.submitWorkLog = async (req, res, next) => {
  try {
    const { date, tasks, blockers } = req.body;
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const totalHours = tasks.reduce((sum, task) => sum + Number(task.hours || 0), 0);

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const existingLog = await WorkLog.findOne({
      employee: employee._id,
      date: { $gte: logDate, $lt: new Date(logDate.getTime() + 86400000) }
    });

    if (existingLog) return res.status(400).json({ success: false, message: 'You have already submitted a log for this date.' });

    const workLog = await WorkLog.create({
      employee: employee._id,
      branch: employee.branch,
      date: logDate,
      tasks,
      blockers,
      totalHours
    });

    // Update project progress dynamically based on time spent vs budget?
    // Not explicitly required right now, just tracking contribution.

    res.status(201).json({ success: true, workLog });
  } catch (err) { next(err); }
};

exports.getMyWorkLogs = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const logs = await WorkLog.find({ employee: employee._id })
      .populate('tasks.project', 'title')
      .sort({ date: -1 });

    res.json({ success: true, count: logs.length, logs });
  } catch (err) { next(err); }
};

exports.getAllWorkLogs = async (req, res, next) => {
  try {
    const { branch, date } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      query.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }

    const logs = await WorkLog.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
      .populate('tasks.project', 'title')
      .sort({ date: -1 });

    // Calculate submission rate if date is provided
    let submissionRate = 0;
    if (date) {
      const empQuery = { status: 'active' };
      if (branch) empQuery.branch = branch;
      const totalEmployees = await Employee.countDocuments(empQuery);
      submissionRate = totalEmployees > 0 ? Math.round((logs.length / totalEmployees) * 100) : 0;
    }

    res.json({ success: true, count: logs.length, submissionRate, logs });
  } catch (err) { next(err); }
};

exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const workLog = await WorkLog.findById(req.params.id).populate('employee');
    if (!workLog) return res.status(404).json({ success: false, message: 'WorkLog not found' });

    workLog.comments.push({
      user: req.user._id,
      name: req.user.name,
      comment
    });
    await workLog.save();

    await createNotification({
      recipient: workLog.employee.userId,
      title: 'New Comment on Work Log',
      message: `${req.user.name} commented on your daily work log for ${new Date(workLog.date).toLocaleDateString()}.`,
      type: 'system',
      link: '/developer/tasks'
    });

    res.json({ success: true, workLog });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const workLog = await WorkLog.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, workLog });
  } catch (err) { next(err); }
};
