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
const Advance = require('../models/Advance');
const Loan = require('../models/Loan');
const { createNotification } = require('../services/notificationService');

const dateRange = (start, end) => ({
  $gte: start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1),
  $lte: end ? new Date(end + 'T23:59:59.999Z') : new Date(),
});
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers to generate match conditions with optional branch ──────────────
const getEmpMatch = (branchId) => branchId ? { branch: branchId } : {};
const getProjMatch = (branchId) => branchId ? { branch: branchId } : {};
const getInvMatch = (branchId) => branchId ? { branch: branchId } : {};
const getFinMatch = (branchId) => branchId ? { branch: branchId } : {};
const getSubMatch = (branchId) => branchId ? { branch: branchId } : {};

async function getEmpIds(branchId) {
  if (!branchId) return null;
  const emps = await Employee.find({ branch: branchId }).select('_id');
  return emps.map(e => e._id);
}

// @desc    Admin dashboard analytics
// @route   GET /api/analytics/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const monthEnd = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const empMatch = getEmpMatch(branch);
    const projMatch = getProjMatch(branch);
    const invMatch = getInvMatch(branch);
    const finMatch = getFinMatch(branch);
    const subMatch = getSubMatch(branch);

    const branchEmpIds = await getEmpIds(branch);
    const relatedEmpMatch = branchEmpIds ? { employee: { $in: branchEmpIds } } : {};

    const [
      totalEmployees, activeEmployees, internCount,
      totalProjects, activeProjects, completedProjects, pendingProjects,
      totalUsers, clientCount,
      totalApplications, newApplications,
      pendingLeaves, insufficientLeaves,
      totalSubscriptions, activeSubscriptions, overdueSubscriptions,
      pendingInvoices, draftPayrolls,
    ] = await Promise.all([
      Employee.countDocuments(empMatch),
      Employee.countDocuments({ ...empMatch, status: 'active' }),
      Employee.countDocuments({ ...empMatch, employmentType: 'intern', status: 'active' }),
      Project.countDocuments(projMatch),
      Project.countDocuments({ ...projMatch, status: 'active' }),
      Project.countDocuments({ ...projMatch, status: 'completed' }),
      Project.countDocuments({ ...projMatch, status: 'planning' }),
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'new' }),
      Leave.countDocuments({ ...relatedEmpMatch, status: 'pending' }),
      Leave.countDocuments({ ...relatedEmpMatch, status: 'pending', insufficientBalance: true }),
      Subscription.countDocuments(subMatch),
      Subscription.countDocuments({ ...subMatch, status: 'active' }),
      Subscription.countDocuments({ ...subMatch, status: 'overdue' }),
      Invoice.countDocuments({ ...invMatch, status: 'unpaid' }),
      Payroll.countDocuments({ ...relatedEmpMatch, status: 'draft' }),
    ]);

    // Outstanding advance & loan balances
    const [advResult, loanResult] = await Promise.all([
      Advance.aggregate([{ $match: { ...relatedEmpMatch, status: 'active' } }, { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }]),
      Loan.aggregate([{ $match: { ...relatedEmpMatch, status: 'active' } }, { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }]),
    ]);
    const outstandingAdvances = advResult[0]?.total || 0;
    const outstandingLoans = loanResult[0]?.total || 0;

    // Expiring interns (internship.endDate within next 7 days)
    const next7 = new Date(now.getTime() + 7 * 86400000);
    const expiredInterns = await Employee.countDocuments({
      ...empMatch,
      employmentType: 'intern', status: 'active',
      'internship.endDate': { $lte: next7 },
    });

    // Revenue this year (from paid invoices)
    const [revenueData, expenseData] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...invMatch, status: 'paid', createdAt: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' } } },
        { $sort: { '_id': 1 } }
      ]),
      FinanceEntry.aggregate([
        { $match: { ...finMatch, type: 'expense', date: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { '_id': 1 } }
      ]),
    ]);

    const totalRevenue = revenueData.reduce((s, d) => s + d.total, 0);
    const totalExpenses = expenseData.reduce((s, d) => s + d.total, 0);

    const subscriptionRevenue = await Subscription.aggregate([
      { $match: { ...subMatch, status: { $in: ['active', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const payrollCost = await Payroll.aggregate([
      { $match: { ...relatedEmpMatch, year: currentYear, status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: '$month', total: { $sum: '$netSalary' } } },
      { $sort: { '_id': 1 } }
    ]);

    const [attendanceByStatus, attendanceToday] = await Promise.all([
      Attendance.aggregate([
        { $match: { ...relatedEmpMatch, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Attendance.aggregate([
        { $match: { ...relatedEmpMatch, date: { $gte: new Date(now.toDateString()), $lte: new Date(now.toDateString() + ' 23:59:59') } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
    ]);

    const salaryDistribution = await Employee.aggregate([
      { $match: { ...empMatch, status: 'active' } },
      {
        $bucket: {
          groupBy: '$basicSalary',
          boundaries: [0, 50000, 100000, 150000, 200000, 300000, 999999999],
          default: '300000+',
          output: { count: { $sum: 1 }, avg: { $avg: '$basicSalary' } }
        }
      }
    ]);

    const projectProgress = await Project.aggregate([
      { $match: projMatch },
      {
        $bucket: {
          groupBy: '$progress',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'unknown',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const invoiceStats = await Invoice.aggregate([
      { $match: invMatch },
      { $group: { _id: null, totalUnpaid: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, '$remainingBalance', 0] } } } }
    ]);
    const outstandingInvoiceTotal = invoiceStats[0]?.totalUnpaid || 0;

    // Daily & Monthly Revenue/Expenses exact values
    const todayStart = new Date(now.toDateString());
    const [revToday, expToday, revMonth, expMonth] = await Promise.all([
      Invoice.aggregate([{ $match: { ...invMatch, status: 'paid', createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      FinanceEntry.aggregate([{ $match: { ...finMatch, type: 'expense', date: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Invoice.aggregate([{ $match: { ...invMatch, status: 'paid', createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      FinanceEntry.aggregate([{ $match: { ...finMatch, type: 'expense', date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const revenueToday = revToday[0]?.total || 0;
    const expenseToday = expToday[0]?.total || 0;
    const revenueMonth = revMonth[0]?.total || 0;
    const expenseMonth = (expMonth[0]?.total || 0) + payrollCost.find(p => p._id === now.getMonth() + 1)?.total || 0;

    // Balances
    const [finances] = await Promise.all([
      FinanceEntry.aggregate([
        { $match: finMatch },
        { $group: { 
          _id: { method: '$paymentMethod', type: '$type' }, 
          total: { $sum: '$amount' } 
        }}
      ])
    ]);

    let bankIn = 0, bankOut = 0, cashIn = 0, cashOut = 0;
    finances.forEach(f => {
      const method = f._id.method?.toLowerCase() || 'cash';
      if (method.includes('bank') || method.includes('transfer')) {
        if (f._id.type === 'income') bankIn += f.total; else bankOut += f.total;
      } else {
        if (f._id.type === 'income') cashIn += f.total; else cashOut += f.total;
      }
    });

    const bankBalance = bankIn - bankOut;
    const cashBalance = cashIn - cashOut;

    const [projectStatus, deptDist, recentProjects, recentApplications, followUps] = await Promise.all([
      Project.aggregate([{ $match: projMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Employee.aggregate([{ $match: empMatch }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Project.find(projMatch).sort({ createdAt: -1 }).limit(5).populate('client', 'name'),
      Application.find().sort({ createdAt: -1 }).limit(5).populate('job', 'title'),
      require('../models/ClientProfile').aggregate([
        { $unwind: '$notes' },
        { $match: { 'notes.followUpDate': { $lte: new Date(now.toDateString() + ' 23:59:59') } } },
        { $sort: { 'notes.followUpDate': -1 } },
        { $limit: 10 }
      ]),
    ]);

    res.json({
      success: true,
      kpis: {
        totalEmployees, activeEmployees, internCount,
        totalProjects, activeProjects, completedProjects, pendingProjects,
        totalUsers, clientCount,
        totalApplications, newApplications,
        pendingLeaves, insufficientLeaves,
        totalSubscriptions, activeSubscriptions, overdueSubscriptions,
        pendingInvoices, draftPayrolls,
        outstandingAdvances, outstandingLoans, expiredInterns,
        totalRevenue, totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
        
        // Advanced Financials
        revenueToday,
        expenseToday,
        revenueMonth,
        expenseMonth,
        revenueQuarter: revenueData.reduce((s, d) => s + d.total, 0), // YTD for now
        expenseQuarter: expenseData.reduce((s, d) => s + d.total, 0), // YTD for now
        outstandingInvoiceTotal,
        bankBalance,
        cashBalance,
        pettyCashBalance: 0,
      },
      charts: {
        revenueData, expenseData, payrollCost,
        attendanceByStatus, attendanceToday,
        salaryDistribution, projectProgress, projectStatus, deptDist,
      },
      recent: { recentProjects, recentApplications, followUps }
    });
  } catch (err) { next(err); }
};

// @desc    Advanced analytics with date range
// @route   GET /api/analytics/advanced
exports.getAdvancedAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, branch } = req.query;
    const range = dateRange(startDate, endDate);

    const empMatch = getEmpMatch(branch);
    const projMatch = getProjMatch(branch);
    const invMatch = getInvMatch(branch);
    
    const branchEmpIds = await getEmpIds(branch);
    const relatedEmpMatch = branchEmpIds ? { employee: { $in: branchEmpIds } } : {};

    const [
      projectsByType, revenueByClient, topEmployees,
      leaveByType, attendanceTrend, payrollTrend,
      invoiceStatus, clientActivity,
    ] = await Promise.all([
      Project.aggregate([
        { $match: { ...projMatch, $or: [{ createdAt: range }, { startDate: range }] } },
        { $group: { _id: '$serviceType', count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } },
        { $sort: { count: -1 } }
      ]),
      Invoice.aggregate([
        { $match: { ...invMatch, status: 'paid', createdAt: range } },
        { $group: { _id: '$client', total: { $sum: '$total' } } },
        { $sort: { total: -1 } }, { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'clientInfo' } },
        { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$clientInfo.name', total: 1 } }
      ]),
      Employee.aggregate([
        { $match: empMatch },
        { $lookup: { from: 'payrolls', localField: '_id', foreignField: 'employee', as: 'payrolls' } },
        { $addFields: { totalEarned: { $sum: '$payrolls.netSalary' } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', department: 1, designation: 1, totalEarned: 1 } },
        { $sort: { totalEarned: -1 } }, { $limit: 10 }
      ]),
      Leave.aggregate([
        { $match: { ...relatedEmpMatch, startDate: range } },
        { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$days' } } },
        { $sort: { totalDays: -1 } }
      ]),
      Attendance.aggregate([
        { $match: { ...relatedEmpMatch, date: range } },
        { $group: { _id: { $month: '$date' }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }, leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } } } },
        { $sort: { '_id': 1 } }
      ]),
      Payroll.aggregate([
        { $match: { ...relatedEmpMatch, createdAt: range } },
        { $group: { _id: { month: '$month', year: '$year' }, totalNet: { $sum: '$netSalary' }, totalGross: { $sum: '$grossSalary' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Invoice.aggregate([
        { $match: { ...invMatch, createdAt: range } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
      ]),
      Project.aggregate([
        { $match: { ...projMatch, createdAt: range } },
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
    const { months: monthsBack = 6, branch } = req.query;
    const lookback = parseInt(monthsBack);
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - lookback, 1);

    const invMatch = getInvMatch(branch);
    const projMatch = getProjMatch(branch);
    const branchEmpIds = await getEmpIds(branch);
    const relatedEmpMatch = branchEmpIds ? { employee: { $in: branchEmpIds } } : {};

    // Historical revenue
    const historicalRevenue = await Invoice.aggregate([
      { $match: { ...invMatch, status: 'paid', createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Historical payroll
    const historicalPayroll = await Payroll.aggregate([
      { $match: { ...relatedEmpMatch, status: { $in: ['approved', 'paid'] }, createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$netSalary' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Historical projects
    const historicalProjects = await Project.aggregate([
      { $match: { ...projMatch, createdAt: { $gte: fromDate } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const predict = (dataPoints) => {
      if (dataPoints.length < 2) return { trend: 0, nextValue: 0, growthRate: 0 };
      const n = dataPoints.length;
      const values = dataPoints.map(d => d.value);
      const avg = values.reduce((a, b) => a + b, 0) / n;
      const last = values[n - 1];
      const prev = values[n - 2];
      const trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;
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
