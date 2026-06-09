const PettyCash = require('../models/PettyCash');
const BankAccount = require('../models/BankAccount');
const { appendBankTransaction } = require('../utils/bankLedger');

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

    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

    const balanceQuery = branch ? { branch } : {};
    const cashFilter = (t) => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash';
    const allForBalance = await PettyCash.find(balanceQuery).lean();
    const cashRows = allForBalance.filter(cashFilter);
    const allIn = cashRows.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const allOut = cashRows.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);
    const currentBalance = allIn - allOut;

    res.json({ success: true, count: transactions.length, transactions, summary: { totalIn, totalOut, currentBalance } });
  } catch (err) { next(err); }
};

// POST /api/petty-cash
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, amount, date, description, category, paidTo, paymentType, referenceNumber, receiptUrl, branch, bankAccount } = req.body;

    // For OUT via CASH: check physical petty cash balance
    if (type === 'out' && (!paymentType || String(paymentType).toLowerCase() === 'cash')) {
      const balanceQuery = branch ? { branch } : {};
      const all = await PettyCash.find(balanceQuery).lean();
      const cashTransactions = all.filter(t => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash');
      const balance = cashTransactions.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0);
      if (Number(amount) > balance) {
        return res.status(400).json({ success: false, message: `Insufficient physical cash balance. Current cash: LKR ${balance.toFixed(2)}` });
      }
    }

    const usesBank = bankAccount && ['bank_transfer', 'card'].includes(String(paymentType || '').toLowerCase());

    if (usesBank) {
      const acc = await BankAccount.findById(bankAccount);
      if (!acc) return res.status(404).json({ success: false, message: 'Selected Bank Account not found' });
      const amt = Number(amount);
      const isIn = type === 'in';
      await appendBankTransaction(bankAccount, {
        type: isIn ? 'deposit' : 'withdrawal',
        amount: amt,
        description: `Petty Cash ${isIn ? 'IN' : 'OUT'}: ${description} (${category})`,
        date: date ? new Date(date) : new Date(),
        reference: referenceNumber || '',
        moduleSource: 'petty_cash',
        sourceType: 'PettyCash',
        recordedBy: req.user._id,
      });
    }

    const balanceQuery = branch ? { branch } : {};
    const priorCash = await PettyCash.find(balanceQuery).lean();
    const isCashPayment = !paymentType || String(paymentType).toLowerCase() === 'cash';
    const priorBalance = priorCash
      .filter(t => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash')
      .reduce((s, t) => (t.type === 'in' ? s + Number(t.amount || 0) : s - Number(t.amount || 0)), 0);
    const amt = Number(amount);
    const runningBalance = isCashPayment
      ? (type === 'in' ? priorBalance + amt : priorBalance - amt)
      : priorBalance;

    const transaction = await PettyCash.create({
      type, amount: amt, date: date || new Date(),
      description, category, paidTo, paymentType, referenceNumber, receiptUrl,
      branch, bankAccount, recordedBy: req.user._id, runningBalance,
    });
    res.status(201).json({ success: true, transaction });
  } catch (err) { next(err); }
};

// DELETE /api/petty-cash/:id
exports.deleteTransaction = async (req, res, next) => {
  try {
    const t = await PettyCash.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const usesBank = t.bankAccount && ['bank_transfer', 'card'].includes(String(t.paymentType || '').toLowerCase());
    if (usesBank) {
      const wasIn = t.type === 'in';
      await appendBankTransaction(t.bankAccount, {
        type: wasIn ? 'withdrawal' : 'deposit',
        amount: t.amount,
        description: `Petty Cash reversal (deleted): ${t.description}`,
        date: new Date(),
        reference: t.referenceNumber || '',
        moduleSource: 'petty_cash',
        recordedBy: req.user._id,
      });
    }

    await PettyCash.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) { next(err); }
};
