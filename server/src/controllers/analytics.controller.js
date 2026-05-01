const User = require('../models/User.model');
const Project = require('../models/Project.model');
const Attendance = require('../models/Attendance.model');
const { Payroll } = require('../models/Salary.model');
const { Appointment } = require('../models/Appointment.model');
const { Revenue, Expense } = require('../models/Financial.model');
const Product = require('../models/Product.model');
const axios = require('axios');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalEmployees, totalProjects, activeProjects, totalProducts, todayAttendance, pendingAppointments] = await Promise.all([
      User.countDocuments({ userType: { $in: ['developer', 'manager', 'marketing_designer'] }, isActive: true }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'in_progress' }),
      Product.countDocuments({ status: 'active' }),
      Attendance.countDocuments({ date: { $gte: new Date(new Date().setHours(0,0,0,0)) }, status: 'present' }),
      Appointment.countDocuments({ status: 'pending' }),
    ]);

    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

    const [monthRevenue, monthExpense] = await Promise.all([
      Revenue.aggregate([{ $match: { date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const recentProjects = await Project.find().populate('assignedTo', 'fullName photo').limit(5).sort({ updatedAt: -1 });
    const recentEmployees = await User.find({ userType: { $in: ['developer', 'manager', 'marketing_designer'] } }).limit(5).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        stats: { totalEmployees, totalProjects, activeProjects, totalProducts, todayAttendance, pendingAppointments },
        financial: { monthRevenue: monthRevenue[0]?.total || 0, monthExpense: monthExpense[0]?.total || 0, monthProfit: (monthRevenue[0]?.total || 0) - (monthExpense[0]?.total || 0) },
        recentProjects, recentEmployees
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAIPredictions = async (req, res) => {
  try {
    const response = await axios.get(`${process.env.PYTHON_SERVICE_URL}/api/analytics/overview`, { timeout: 8000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    // Return mock data if Python service is unavailable
    res.json({ success: true, data: { message: 'AI service offline - showing cached data', salesForecast: [], profitForecast: [], expenseForecast: [] } });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await Revenue.aggregate([
      { $match: { date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) } } },
      { $group: { _id: { month: { $month: '$date' }, category: '$category' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.month': 1 } }
    ]);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
