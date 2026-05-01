const { Revenue, Expense } = require('../models/Financial.model');

exports.getRevenue = async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Revenue.countDocuments(filter);
    const records = await Revenue.find(filter).skip(skip).limit(parseInt(limit)).sort({ date: -1 });
    const totalAmount = await Revenue.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: '$amount' } } }]);
    res.json({ success: true, data: records, totalAmount: totalAmount[0]?.sum || 0, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.addRevenue = async (req, res) => {
  try {
    const record = await Revenue.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json({ success: true, message: 'Revenue recorded', data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateRevenue = async (req, res) => {
  try {
    const record = await Revenue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteRevenue = async (req, res) => {
  try {
    await Revenue.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Revenue deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(filter);
    const records = await Expense.find(filter).skip(skip).limit(parseInt(limit)).sort({ date: -1 });
    const totalAmount = await Expense.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: '$amount' } } }]);
    res.json({ success: true, data: records, totalAmount: totalAmount[0]?.sum || 0, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.addExpense = async (req, res) => {
  try {
    const record = await Expense.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json({ success: true, message: 'Expense recorded', data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateExpense = async (req, res) => {
  try {
    const record = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getFinancialSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const [revenueData, expenseData] = await Promise.all([
      Revenue.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: startDate, $lte: endDate } } }, { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$amount' } } }])
    ]);

    const totalRevenue = revenueData.reduce((s, r) => s + r.total, 0);
    const totalExpense = expenseData.reduce((s, r) => s + r.total, 0);

    res.json({ success: true, data: { totalRevenue, totalExpense, profit: totalRevenue - totalExpense, revenueByMonth: revenueData, expenseByMonth: expenseData } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
