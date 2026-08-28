const User = require('../models/User');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const Application = require('../models/Application');
const Invoice = require('../models/Invoice');
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const Performance = require('../models/Performance');
const { createNotification } = require('../services/notificationService');

// @desc    Admin dashboard analytics
// @route   GET /api/analytics/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalEmployees, activeEmployees,
      totalProjects, activeProjects, completedProjects,
      totalUsers, clientCount,
      totalApplications, newApplications,
      pendingLeaves,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'completed' }),
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'new' }),
      Leave.countDocuments({ status: 'pending' }),
    ]);

    // Revenue this year
    const currentYear = new Date().getFullYear();
    const revenueData = await Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: new Date(`${currentYear}-01-01`) } } },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' } } },
      { $sort: { '_id': 1 } }
    ]);

    // Monthly payroll cost
    const payrollCost = await Payroll.aggregate([
      { $match: { year: currentYear, status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: '$month', total: { $sum: '$netSalary' } } },
      { $sort: { '_id': 1 } }
    ]);

    // Attendance analytics (current month)
    const monthStart = new Date(currentYear, new Date().getMonth(), 1);
    const monthEnd = new Date(currentYear, new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    const attendanceByStatus = await Attendance.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Salary distribution (basic salary buckets)
    const salaryDistribution = await Employee.aggregate([
      { $match: { status: 'active' } },
      {
        $bucket: {
          groupBy: '$basicSalary',
          boundaries: [0, 50000, 100000, 150000, 200000, 300000, 999999999],
          default: '300000+',
          output: { count: { $sum: 1 }, avg: { $avg: '$basicSalary' } }
        }
      }
    ]);

    // Performance overview (top performers last 90 days)
    const perfStart = new Date();
    perfStart.setDate(perfStart.getDate() - 90);
    const performanceTop = await Performance.aggregate([
      { $match: { createdAt: { $gte: perfStart } } },
      { $group: { _id: '$developer', avgScore: { $avg: '$score' }, records: { $sum: 1 } } },
      { $sort: { avgScore: -1 } },
      { $limit: 8 }
    ]);

    // Project progress buckets
    const projectProgress = await Project.aggregate([
      {
        $bucket: {
          groupBy: '$progress',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'unknown',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Project status distribution
    const projectStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Department distribution
    const deptDist = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent activities
    const recentProjects = await Project.find().sort({ createdAt: -1 }).limit(5).populate('client', 'name');
    const recentApplications = await Application.find().sort({ createdAt: -1 }).limit(5).populate('job', 'title');

    res.json({
      success: true,
      kpis: {
        totalEmployees, activeEmployees,
        totalProjects, activeProjects, completedProjects,
        totalUsers, clientCount,
        totalApplications, newApplications,
        pendingLeaves,
      },
      charts: {
        revenueData,
        payrollCost,
        attendanceByStatus,
        salaryDistribution,
        performanceTop,
        projectProgress,
        projectStatus,
        deptDist,
      },
      recent: { recentProjects, recentApplications }
    });
  } catch (err) { next(err); }
};

// @desc    Notification controller
// @route   GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications });
  } catch (err) { next(err); }
};

// @desc    Mark notifications read
// @route   PUT /api/notifications/read
exports.markRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

// @desc    Mark single notification read
// @route   PUT /api/analytics/notifications/:id/read
exports.markSingleRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (err) { next(err); }
};

// @desc    Get single notification
// @route   GET /api/analytics/notifications/:id
exports.getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (err) { next(err); }
};

exports.broadcastAnnouncement = async (req, res, next) => {
  try {
    const { title, message, roles = [] } = req.body;
    const query = roles.length ? { role: { $in: roles }, isActive: true } : { isActive: true };
    const users = await User.find(query).select('_id');
    await Promise.all(users.map((u) => createNotification({
      recipient: u._id,
      title: title || 'Announcement',
      message: message || 'New announcement posted.',
      type: 'system',
    })));
    res.json({ success: true, notified: users.length });
  } catch (err) { next(err); }
};

exports.sendBirthdayNotifications = async (req, res, next) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const employees = await Employee.find().populate('userId', 'name _id');
    const birthdayUsers = employees.filter((emp) => emp.dob && new Date(emp.dob).getMonth() + 1 === month && new Date(emp.dob).getDate() === day);

    const allUsers = await User.find({ isActive: true }).select('_id');
    for (const person of birthdayUsers) {
      await Promise.all(allUsers.map((u) => createNotification({
        recipient: u._id,
        title: 'Team Birthday',
        message: `Today is ${person.userId?.name}'s birthday.`,
        type: 'birthday',
      })));
    }
    res.json({ success: true, birthdays: birthdayUsers.length });
  } catch (err) { next(err); }
};
