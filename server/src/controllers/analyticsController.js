const User = require('../models/User');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Payroll = require('../models/Payroll');
const Application = require('../models/Application');
const Invoice = require('../models/Invoice');
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const Subscription = require('../models/Subscription');
const FinanceEntry = require('../models/FinanceEntry');
const { createNotification } = require('../services/notificationService');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dateRange = (start, end) => ({
  $gte: start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1),
  $lte: end ? new Date(end + 'T23:59:59.999Z') : new Date(),
});
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// @desc    Admin dashboard analytics
// @route   GET /api/analytics/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const monthEnd = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalEmployees, activeEmployees,
      totalProjects, activeProjects, completedProjects, pendingProjects,
      totalUsers, clientCount,
      totalApplications, newApplications,
      pendingLeaves,
      totalSubscriptions, activeSubscriptions, overdueSubscriptions,
      pendingInvoices,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'completed' }),
      Project.countDocuments({ status: 'planning' }),
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'new' }),
      Leave.countDocuments({ status: 'pending' }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'overdue' }),
      Invoice.countDocuments({ status: 'unpaid' }),
    ]);

    // Revenue this year (from paid invoices)
    const [revenueData, expenseData] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' } } },
        { $sort: { '_id': 1 } }
      ]),
      FinanceEntry.aggregate([
        { $match: { type: 'expense', date: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { '_id': 1 } }
      ]),
    ]);

    // Total revenue & expenses YTD
    const totalRevenue = revenueData.reduce((s, d) => s + d.total, 0);
    const totalExpenses = expenseData.reduce((s, d) => s + d.total, 0);

    // Subscription revenue this month
    const subscriptionRevenue = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Monthly payroll cost
    const payrollCost = await Payroll.aggregate([
      { $match: { year: currentYear, status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: '$month', total: { $sum: '$netSalary' } } },
      { $sort: { '_id': 1 } }
    ]);

    // Attendance this month
    const [attendanceByStatus, attendanceToday] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: new Date(now.toDateString()), $lte: new Date(now.toDateString() + ' 23:59:59') } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
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

    const [projectStatus, deptDist, recentProjects, recentApplications] = await Promise.all([
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Employee.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Project.find().sort({ createdAt: -1 }).limit(5).populate('client', 'name'),
      Application.find().sort({ createdAt: -1 }).limit(5).populate('job', 'title'),
    ]);

    res.json({
      success: true,
      kpis: {
        totalEmployees, activeEmployees,
        totalProjects, activeProjects, completedProjects, pendingProjects,
        totalUsers, clientCount,
        totalApplications, newApplications,
        pendingLeaves,
        totalSubscriptions, activeSubscriptions, overdueSubscriptions,
        pendingInvoices,
        totalRevenue, totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
      },
      charts: {
        revenueData, expenseData, payrollCost,
        attendanceByStatus, attendanceToday,
        salaryDistribution, projectProgress, projectStatus, deptDist,
      },
      recent: { recentProjects, recentApplications }
    });
  } catch (err) { next(err); }
};

// @desc    Advanced analytics with date range
// @route   GET /api/analytics/advanced
exports.getAdvancedAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const range = dateRange(startDate, endDate);

    const [
      projectsByType, revenueByClient, topEmployees,
      leaveByType, attendanceTrend, payrollTrend,
      invoiceStatus, clientActivity,
    ] = await Promise.all([
      Project.aggregate([
        { $match: { $or: [{ createdAt: range }, { startDate: range }] } },
        { $group: { _id: '$serviceType', count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } },
        { $sort: { count: -1 } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid', createdAt: range } },
        { $group: { _id: '$client', total: { $sum: '$total' } } },
        { $sort: { total: -1 } }, { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'clientInfo' } },
        { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$clientInfo.name', total: 1 } }
      ]),
      Employee.aggregate([
        { $lookup: { from: 'payrolls', localField: '_id', foreignField: 'employee', as: 'payrolls' } },
        { $addFields: { totalEarned: { $sum: '$payrolls.netSalary' } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', department: 1, designation: 1, totalEarned: 1 } },
        { $sort: { totalEarned: -1 } }, { $limit: 10 }
      ]),
      Leave.aggregate([
        { $match: { startDate: range } },
        { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$days' } } },
        { $sort: { totalDays: -1 } }
      ]),
      Attendance.aggregate([
        { $match: { date: range } },
        { $group: { _id: { $month: '$date' }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }, leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } } } },
        { $sort: { '_id': 1 } }
      ]),
      Payroll.aggregate([
        { $match: { createdAt: range } },
        { $group: { _id: { month: '$month', year: '$year' }, totalNet: { $sum: '$netSalary' }, totalGross: { $sum: '$grossSalary' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Invoice.aggregate([
        { $match: { createdAt: range } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
      ]),
      Project.aggregate([
        { $match: { createdAt: range } },
        { $lookup: { from: 'users', localField: 'client', foreignField: '_id', as: 'clientInfo' } },
        { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$client', name: { $first: '$clientInfo.name' }, projects: { $sum: 1 }, totalBudget: { $sum: '$budget' } } },
        { $sort: { projects: -1 } }, { $limit: 10 }
      ]),
    ]);

    res.json({
      success: true,
      projectsByType,
      revenueByClient,
      topEmployees,
      leaveByType,
      attendanceTrend: attendanceTrend.map(d => ({ month: months[d._id - 1], ...d })),
      payrollTrend: payrollTrend.map(d => ({ label: `${months[d._id.month - 1]} ${d._id.year}`, ...d })),
      invoiceStatus,
      clientActivity,
    });
  } catch (err) { next(err); }
};

// @desc    AI predictions endpoint
// @route   GET /api/analytics/ai-predict
exports.getAIPredictions = async (req, res, next) => {
  try {
    const { months: monthsBack = 6 } = req.query;
    const lookback = parseInt(monthsBack);
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - lookback, 1);

    // Historical revenue
    const historicalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Historical payroll
    const historicalPayroll = await Payroll.aggregate([
      { $match: { status: { $in: ['approved', 'paid'] }, createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$netSalary' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Historical projects
    const historicalProjects = await Project.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Simple linear regression prediction
    const predict = (dataPoints) => {
      if (dataPoints.length < 2) return { trend: 0, nextValue: 0, growthRate: 0 };
      const n = dataPoints.length;
      const values = dataPoints.map(d => d.value);
      const avg = values.reduce((a, b) => a + b, 0) / n;
      const last = values[n - 1];
      const prev = values[n - 2];
      const trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
      // Simple moving average for next period
      const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, n);
      const nextValue = Math.round(recentAvg * (1 + trend / 200));
      return { trend: Math.round(trend * 10) / 10, nextValue, avg: Math.round(avg), growthRate: trend };
    };

    const revPoints = historicalRevenue.map(d => ({ label: `${months[d._id.month - 1]} ${d._id.year}`, value: d.total }));
    const payrollPoints = historicalPayroll.map(d => ({ label: `${months[d._id.month - 1]} ${d._id.year}`, value: d.total }));
    const projectPoints = historicalProjects.map(d => ({ label: `${months[d._id.month - 1]} ${d._id.year}`, value: d.count }));

    const revPrediction = predict(revPoints);
    const payrollPrediction = predict(payrollPoints);
    const projectPrediction = predict(projectPoints);

    const nextMonthName = months[now.getMonth() === 11 ? 0 : now.getMonth() + 1];

    // Generate AI suggestions
    const suggestions = [];
    if (revPrediction.trend > 10) suggestions.push({ type: 'positive', icon: '📈', message: `Revenue is trending upward by ${revPrediction.trend}%. Predicted next month revenue: LKR ${revPrediction.nextValue.toLocaleString()}.` });
    else if (revPrediction.trend < -5) suggestions.push({ type: 'warning', icon: '📉', message: `Revenue decline detected (${revPrediction.trend}%). Consider reviewing project pipeline and client outreach.` });
    else suggestions.push({ type: 'neutral', icon: '📊', message: `Revenue is stable. Predicted ${nextMonthName} revenue: LKR ${revPrediction.nextValue.toLocaleString()}.` });

    if (payrollPrediction.trend > 15) suggestions.push({ type: 'warning', icon: '💰', message: `Payroll costs are rising fast (+${payrollPrediction.trend}%). Review staffing levels and OT allocation.` });
    if (projectPrediction.trend > 20) suggestions.push({ type: 'positive', icon: '🚀', message: `Project intake is growing by ${projectPrediction.trend}%. Plan capacity accordingly.` });
    if (projectPrediction.trend < -10) suggestions.push({ type: 'warning', icon: '⚠️', message: `New project intake is declining. Focus on sales and business development.` });

    const netProfitTrend = revPrediction.trend - payrollPrediction.trend;
    if (netProfitTrend > 5) suggestions.push({ type: 'positive', icon: '✅', message: `Net profit margin is improving. Revenue growth outpacing payroll costs.` });

    res.json({
      success: true,
      historical: { revenue: revPoints, payroll: payrollPoints, projects: projectPoints },
      predictions: {
        revenue: { ...revPrediction, label: `${nextMonthName} Revenue` },
        payroll: { ...payrollPrediction, label: `${nextMonthName} Payroll` },
        projects: { ...projectPrediction, label: `${nextMonthName} Projects` },
      },
      suggestions,
      period: { from: fromDate.toISOString(), to: now.toISOString(), months: lookback },
    });
  } catch (err) { next(err); }
};

// Notification controllers (unchanged)
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.markSingleRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true, readAt: new Date() }, { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) { next(err); }
};

exports.getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) { next(err); }
};

exports.broadcastAnnouncement = async (req, res, next) => {
  try {
    const { title, message, roles = [] } = req.body;
    const query = roles.length ? { role: { $in: roles }, isActive: true } : { isActive: true };
    const users = await User.find(query).select('_id');
    await Promise.all(users.map(u => createNotification({ recipient: u._id, title: title || 'Announcement', message: message || 'New announcement.', type: 'system' })));
    res.json({ success: true, notified: users.length });
  } catch (err) { next(err); }
};

exports.sendBirthdayNotifications = async (req, res, next) => {
  try {
    const now = new Date();
    const employees = await Employee.find().populate('userId', 'name _id');
    const birthdayUsers = employees.filter(e => e.dob && new Date(e.dob).getMonth() === now.getMonth() && new Date(e.dob).getDate() === now.getDate());
    const allUsers = await User.find({ isActive: true }).select('_id');
    for (const p of birthdayUsers) {
      await Promise.all(allUsers.map(u => createNotification({ recipient: u._id, title: 'Team Birthday', message: `Today is ${p.userId?.name}'s birthday! 🎂`, type: 'birthday' })));
    }
    res.json({ success: true, birthdays: birthdayUsers.length });
  } catch (err) { next(err); }
};
