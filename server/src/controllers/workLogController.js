const WorkLog = require('../models/WorkLog');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const emailService = require('../services/emailService');
const path = require('path');

exports.submitWorkLog = async (req, res, next) => {
  try {
    const { date, tasks, blockers, notes, projectLinks } = req.body;

    const employee = await Employee.findOne({ userId: req.user._id }).populate('userId', 'name role');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found. Please contact your admin.' });
    }

    // Parse tasks if sent as string (multipart form)
    let parsedTasks = tasks;
    if (typeof tasks === 'string') {
      try { parsedTasks = JSON.parse(tasks); } catch { parsedTasks = []; }
    }
    let parsedLinks = projectLinks;
    if (typeof projectLinks === 'string') {
      try { parsedLinks = JSON.parse(projectLinks); } catch { parsedLinks = []; }
    }

    const totalHours = (parsedTasks || []).reduce((sum, task) => sum + Number(task.hours || 0), 0);

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const existingLog = await WorkLog.findOne({
      employee: employee._id,
      date: { $gte: logDate, $lt: new Date(logDate.getTime() + 86400000) }
    });

    if (existingLog) {
      return res.status(400).json({ success: false, message: 'You have already submitted a log for this date.' });
    }

    // Handle uploaded files
    const screenshots = [];
    const attachments = [];
    if (req.files) {
      (req.files.screenshots || []).forEach(f => {
        screenshots.push(`/uploads/worklogs/${f.filename}`);
      });
      (req.files.attachments || []).forEach(f => {
        attachments.push(`/uploads/worklogs/${f.filename}`);
      });
    }

    const workLog = await WorkLog.create({
      employee: employee._id,
      employeeRole: req.user.role,
      branch: employee.branch,
      date: logDate,
      tasks: parsedTasks || [],
      blockers: blockers || '',
      notes: notes || '',
      totalHours,
      screenshots,
      attachments,
      projectLinks: parsedLinks || [],
      approvalStatus: 'pending',
    });

    // Email managers about new submission
    const managers = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true }).select('email').limit(5);
    const managerEmails = managers.map(m => m.email).filter(Boolean);
    await emailService.sendWorkLogSubmittedEmail(managerEmails, req.user.name, logDate, (parsedTasks || []).length);

    res.status(201).json({ success: true, workLog });
  } catch (err) { next(err); }
};

exports.getMyWorkLogs = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found.' });
    }

    const logs = await WorkLog.find({ employee: employee._id })
      .populate('tasks.project', 'title')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, count: logs.length, logs });
  } catch (err) { next(err); }
};

exports.getAllWorkLogs = async (req, res, next) => {
  try {
    const { branch, date, role } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (role && role !== 'all') query.employeeRole = role;
    if (date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      query.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }

    const logs = await WorkLog.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar role' } })
      .populate('tasks.project', 'title')
      .populate('approvedBy', 'name')
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
    if (!comment) return res.status(400).json({ success: false, message: 'Comment is required' });

    const workLog = await WorkLog.findById(req.params.id).populate('employee');
    if (!workLog) return res.status(404).json({ success: false, message: 'WorkLog not found' });

    workLog.comments.push({
      user: req.user._id,
      name: req.user.name,
      comment
    });
    await workLog.save();

    if (workLog.employee?.userId) {
      await createNotification({
        recipient: workLog.employee.userId,
        title: 'New Comment on Work Log',
        message: `${req.user.name} commented on your daily work log for ${new Date(workLog.date).toLocaleDateString()}.`,
        type: 'system',
        link: `/${req.user.role === 'admin' ? 'developer' : 'developer'}/work-logs`
      }).catch(() => {});
    }

    res.json({ success: true, workLog });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const workLog = await WorkLog.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!workLog) return res.status(404).json({ success: false, message: 'WorkLog not found' });
    res.json({ success: true, workLog });
  } catch (err) { next(err); }
};

exports.approveWorkLog = async (req, res, next) => {
  try {
    const { approvalStatus, approvalNote } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status' });
    }

    const workLog = await WorkLog.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus,
        approvalNote: approvalNote || '',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: approvalStatus === 'approved' ? 'reviewed' : 'flagged',
      },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: 'name' } });

    if (!workLog) return res.status(404).json({ success: false, message: 'WorkLog not found' });

    if (workLog.employee?.userId) {
      const empUser = await User.findById(workLog.employee.userId._id || workLog.employee.userId).select('email name');
      await createNotification({
        recipient: workLog.employee.userId._id || workLog.employee.userId,
        title: `Work Log ${approvalStatus === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
        message: `Your work log for ${new Date(workLog.date).toLocaleDateString()} has been ${approvalStatus}${approvalNote ? ': ' + approvalNote : '.'}`,
        type: 'system',
        link: '/developer/work-logs'
      }).catch(() => {});
      // Send email
      if (approvalStatus === 'approved' && empUser?.email) {
        await emailService.sendWorkLogApprovedEmail(empUser.email, empUser.name, workLog.date, approvalNote);
      }
    }

    res.json({ success: true, workLog });
  } catch (err) { next(err); }
};
