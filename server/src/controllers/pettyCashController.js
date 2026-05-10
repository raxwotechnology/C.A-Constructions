const PettyCash = require('../models/PettyCash');
const BankAccount = require('../models/BankAccount');

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

    // Compute summary (Total In/Out includes all payment types, but we'll isolate cash for current balance)
    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    
    // Physical cash balance should only count cash transactions
    const cashIn = transactions.filter(t => t.type === 'in' && (t.paymentType === 'cash' || !t.paymentType)).reduce((s, t) => s + t.amount, 0);
    const cashOut = transactions.filter(t => t.type === 'out' && (t.paymentType === 'cash' || !t.paymentType)).reduce((s, t) => s + t.amount, 0);
    const currentBalance = cashIn - cashOut;

    res.json({ success: true, count: transactions.length, transactions, summary: { totalIn, totalOut, currentBalance } });
  } catch (err) { next(err); }
};

// POST /api/petty-cash
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, amount, date, description, category, paidTo, paymentType, referenceNumber, receiptUrl, branch, bankAccount } = req.body;

    // For OUT via CASH: check physical petty cash balance
    if (type === 'out' && paymentType === 'cash') {
      const q = branch ? { branch } : { branch: { $exists: false } };
      const all = await PettyCash.find(branch ? { branch } : { $or: [{ branch: null }, { branch: { $exists: false } }] });
      // Only count cash transactions towards the physical petty cash balance
      const cashTransactions = all.filter(t => t.paymentType === 'cash' || !t.paymentType);
      const balance = cashTransactions.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0);
      if (Number(amount) > balance) {
        return res.status(400).json({ success: false, message: `Insufficient physical cash balance. Current cash: LKR ${balance.toFixed(2)}` });
      }
    }

    // Process Bank Transfer logic if bankAccount is provided
    if (paymentType === 'bank_transfer' && bankAccount) {
      const account = await BankAccount.findById(bankAccount);
      if (!account) return res.status(404).json({ success: false, message: 'Selected Bank Account not found' });
      
      const amt = Number(amount);
      // Both IN (fund top-up) and OUT (expense) mean money leaves the bank account
      // If it's a fund top-up, money moves from Bank to Petty Cash
      // If it's an expense, money moves from Bank to Vendor
      account.currentBalance = (account.currentBalance || 0) - amt;
      
      account.transactions.push({
        type: 'withdrawal',
        amount: amt,
        balanceAfter: account.currentBalance,
        description: `Petty Cash: ${description} (${category})`,
        date: date ? new Date(date) : new Date(),
        reference: referenceNumber || '',
        recordedBy: req.user._id,
      });
      await account.save();
    }

    const transaction = await PettyCash.create({
      type, amount: Number(amount), date: date || new Date(),
      description, category, paidTo, paymentType, referenceNumber, receiptUrl,
      branch, bankAccount, recordedBy: req.user._id,
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
