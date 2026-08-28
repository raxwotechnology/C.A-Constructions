const PettyCash = require('../models/PettyCash');
const BankAccount = require('../models/BankAccount');
const Cheque = require('../models/Cheque');
const { appendBankTransaction } = require('../utils/bankLedger');

// GET /api/petty-cash
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, branch, isCashCheque } = req.query;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (branch) query.branch = branch;
    if (isCashCheque !== undefined) query.isCashCheque = isCashCheque === 'true';

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }

    const transactions = await PettyCash.find(query)
      .populate('recordedBy', 'name')
      .populate('branch', 'name')
      .populate('bankAccount', 'accountName bankName accountNumber')
      .populate('chequeId')
      .sort({ date: -1 });

    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);

    const balanceQuery = branch ? { branch } : {};
    const cashFilter = (t) => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash' || t.type === 'in';
    const allForBalance = await PettyCash.find(balanceQuery).lean();
    const cashRows = allForBalance.filter(cashFilter);
    const allIn = cashRows.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
    const allOut = cashRows.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);
    const currentBalance = allIn - allOut;

    // Detailed Breakdown Aggregation Report across categories (Tea Expense, Refreshments, Stationery, etc.)
    const breakdownReport = {};
    transactions.forEach(t => {
      if (Array.isArray(t.expenseBreakdown) && t.expenseBreakdown.length > 0) {
        t.expenseBreakdown.forEach(item => {
          const cat = item.category || 'Other';
          breakdownReport[cat] = (breakdownReport[cat] || 0) + Number(item.amount || 0);
        });
      } else {
        const cat = t.category || 'Other';
        breakdownReport[cat] = (breakdownReport[cat] || 0) + Number(t.amount || 0);
      }
    });

    res.json({
      success: true,
      count: transactions.length,
      transactions,
      summary: { totalIn, totalOut, currentBalance },
      breakdownReport,
    });
  } catch (err) { next(err); }
};

// POST /api/petty-cash
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      type, amount, date, description, category, paidTo, paymentType,
      isCashCheque, chequeNumber, bankAccount, expenseBreakdown,
      referenceNumber, receiptUrl, branch,
    } = req.body;

    const amt = Number(amount);
    const isCheque = paymentType === 'cheque' || isCashCheque === true;

    // For OUT via CASH: check physical petty cash balance
    if (type === 'out' && (!paymentType || String(paymentType).toLowerCase() === 'cash')) {
      const balanceQuery = branch ? { branch } : {};
      const all = await PettyCash.find(balanceQuery).lean();
      const cashTransactions = all.filter(t => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash');
      const balance = cashTransactions.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0);
      if (amt > balance) {
        return res.status(400).json({ success: false, message: `Insufficient physical cash balance. Current cash: LKR ${balance.toFixed(2)}` });
      }
    }

    let chequeRecord = null;

    // Handle Cash Cheque Top-up or Expense
    if (isCheque && bankAccount) {
      const bankAcc = await BankAccount.findById(bankAccount);
      if (!bankAcc) return res.status(404).json({ success: false, message: 'Selected Bank Account not found' });

      // Create issued Cash Cheque entry in Cheque ledger
      const chqNo = chequeNumber || 'CHQ-' + Date.now().toString().slice(-6);
      chequeRecord = await Cheque.create({
        direction: 'issued',
        paymentType: 'outgoing',
        source: 'expense',
        status: 'cleared',
        amount: amt,
        chequeNumber: chqNo,
        chequeDate: date ? new Date(date) : new Date(),
        bankName: bankAcc.bankName || 'Bank',
        drawerOrPayee: paidTo || 'Petty Cash Cash Cheque',
        bankAccount,
        branch,
        notes: `Cash Cheque for Petty Cash: ${description || 'Petty Cash Funding'}`,
        recordedBy: req.user._id,
        ledgerPosted: true,
        ledgerPostedAt: new Date(),
      });

      // Auto deduct from Bank Account!
      await appendBankTransaction(bankAccount, {
        type: 'withdrawal',
        amount: amt,
        description: `Petty Cash Cash Cheque (${chqNo}): ${description}`,
        date: date ? new Date(date) : new Date(),
        reference: chqNo,
        moduleSource: 'petty_cash_cheque',
        sourceType: 'Cheque',
        recordedBy: req.user._id,
      });
    } else if (bankAccount && ['bank_transfer', 'card'].includes(String(paymentType || '').toLowerCase())) {
      const acc = await BankAccount.findById(bankAccount);
      if (!acc) return res.status(404).json({ success: false, message: 'Selected Bank Account not found' });
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
    const isCashPayment = !paymentType || String(paymentType).toLowerCase() === 'cash' || type === 'in';
    const priorBalance = priorCash
      .filter(t => !t.paymentType || String(t.paymentType).toLowerCase() === 'cash' || t.type === 'in')
      .reduce((s, t) => (t.type === 'in' ? s + Number(t.amount || 0) : s - Number(t.amount || 0)), 0);

    const runningBalance = isCashPayment
      ? (type === 'in' ? priorBalance + amt : priorBalance - amt)
      : priorBalance;

    const transaction = await PettyCash.create({
      type,
      amount: amt,
      date: date || new Date(),
      description,
      category: category || 'other',
      paidTo,
      paymentType: paymentType || 'cash',
      isCashCheque: !!isCheque,
      chequeNumber: chequeNumber || (chequeRecord ? chequeRecord.chequeNumber : ''),
      chequeId: chequeRecord ? chequeRecord._id : null,
      bankAccount: bankAccount || null,
      expenseBreakdown: Array.isArray(expenseBreakdown) ? expenseBreakdown : [],
      referenceNumber,
      receiptUrl,
      branch,
      recordedBy: req.user._id,
      runningBalance,
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) { next(err); }
};

// DELETE /api/petty-cash/:id
exports.deleteTransaction = async (req, res, next) => {
  try {
    const t = await PettyCash.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const usesBank = t.bankAccount && (t.isCashCheque || ['bank_transfer', 'card', 'cheque'].includes(String(t.paymentType || '').toLowerCase()));
    if (usesBank) {
      const wasIn = t.type === 'in';
      await appendBankTransaction(t.bankAccount, {
        type: wasIn ? 'withdrawal' : 'deposit',
        amount: t.amount,
        description: `Petty Cash reversal (deleted): ${t.description}`,
        date: new Date(),
        reference: t.referenceNumber || t.chequeNumber || '',
        moduleSource: 'petty_cash',
        recordedBy: req.user._id,
      });
    }

    if (t.chequeId) {
      await Cheque.findByIdAndDelete(t.chequeId);
    }

    await PettyCash.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) { next(err); }
};

// PUT /api/petty-cash/:id
exports.updateTransaction = async (req, res, next) => {
  try {
    const { amount, date, description, category, paidTo, paymentType, referenceNumber, branch, expenseBreakdown } = req.body;
    let t = await PettyCash.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Transaction not found' });

    t.amount = amount !== undefined ? Number(amount) : t.amount;
    t.date = date !== undefined ? new Date(date) : t.date;
    t.description = description !== undefined ? description : t.description;
    t.category = category !== undefined ? category : t.category;
    t.paidTo = paidTo !== undefined ? paidTo : t.paidTo;
    t.paymentType = paymentType !== undefined ? paymentType : t.paymentType;
    t.referenceNumber = referenceNumber !== undefined ? referenceNumber : t.referenceNumber;
    t.branch = branch !== undefined ? branch : t.branch;
    if (Array.isArray(expenseBreakdown)) {
      t.expenseBreakdown = expenseBreakdown;
    }

    await t.save();
    res.json({ success: true, transaction: t });
  } catch (err) { next(err); }
};
