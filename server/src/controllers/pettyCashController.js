const PettyCash = require('../models/PettyCash');

// GET /api/petty-cash
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, branch } = req.query;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (branch) query.branch = branch;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }
    const transactions = await PettyCash.find(query)
      .populate('recordedBy', 'name')
      .populate('branch', 'name')
      .sort({ date: -1 });

    // Compute summary
    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    const currentBalance = totalIn - totalOut;

    res.json({ success: true, count: transactions.length, transactions, summary: { totalIn, totalOut, currentBalance } });
  } catch (err) { next(err); }
};

// POST /api/petty-cash
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, amount, date, description, category, paidTo, paymentType, referenceNumber, receiptUrl, branch } = req.body;

    // For OUT: check balance
    if (type === 'out') {
      const q = branch ? { branch } : { branch: { $exists: false } }; // or global if no branch
      // Actually, if branch is given, check branch balance. If not given, check global pool.
      const all = await PettyCash.find(branch ? { branch } : { $or: [{ branch: null }, { branch: { $exists: false } }] });
      const balance = all.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0);
      if (Number(amount) > balance) {
        return res.status(400).json({ success: false, message: `Insufficient petty cash balance. Current balance: LKR ${balance.toFixed(2)}` });
      }
    }

    const transaction = await PettyCash.create({
      type, amount: Number(amount), date: date || new Date(),
      description, category, paidTo, paymentType, referenceNumber, receiptUrl,
      branch, recordedBy: req.user._id,
    });
    res.status(201).json({ success: true, transaction });
  } catch (err) { next(err); }
};

// DELETE /api/petty-cash/:id
exports.deleteTransaction = async (req, res, next) => {
  try {
    const t = await PettyCash.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) { next(err); }
};
