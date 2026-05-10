const BankAccount = require('../models/BankAccount');

// GET /api/bank-accounts
exports.getAccounts = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.branch) query.branch = req.query.branch;
    const accounts = await BankAccount.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: accounts.length, accounts });
  } catch (err) { next(err); }
};

// POST /api/bank-accounts
exports.createAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.create({ ...req.body });
    res.status(201).json({ success: true, account });
  } catch (err) { next(err); }
};

// PUT /api/bank-accounts/:id
exports.updateAccount = async (req, res, next) => {
  try {
    const allowed = ['bankName', 'accountHolder', 'accountType', 'branchName', 'currency', 'notes', 'isActive'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const account = await BankAccount.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, account });
  } catch (err) { next(err); }
};

// DELETE /api/bank-accounts/:id
exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Account removed' });
  } catch (err) { next(err); }
};

// POST /api/bank-accounts/:id/transaction
exports.recordTransaction = async (req, res, next) => {
  try {
    const { type, amount, description, date, reference } = req.body;
    const account = await BankAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const isCredit = ['deposit', 'transfer_in'].includes(type);
    account.currentBalance = (account.currentBalance || 0) + (isCredit ? amt : -amt);

    account.transactions.push({
      type,
      amount: amt,
      balanceAfter: account.currentBalance,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      reference: reference || '',
      recordedBy: req.user?._id,
    });

    await account.save();
    res.json({ success: true, account });
  } catch (err) { next(err); }
};
