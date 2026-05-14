const Cheque = require('../models/Cheque');

exports.getCheque = async (req, res, next) => {
  try {
    const cheque = await Cheque.findById(req.params.id)
      .populate('bankAccount', 'bankName accountNumber accountHolder branchName currentBalance')
      .populate('linkedSubscription', 'title subscriptionNo status nextDueDate')
      .populate('linkedInvoice', 'invoiceNo status total remainingBalance')
      .populate('recordedBy', 'name email')
      .populate('branch', 'name')
      .lean();
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    res.json({ success: true, cheque });
  } catch (err) { next(err); }
};

exports.listCheques = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.source) q.source = req.query.source;
    if (req.query.direction) q.direction = req.query.direction;
    if (req.query.branch) q.branch = req.query.branch;

    const cheques = await Cheque.find(q)
      .populate('bankAccount', 'bankName accountNumber accountHolder branchName currentBalance')
      .populate('linkedSubscription', 'title subscriptionNo status nextDueDate')
      .populate('linkedInvoice', 'invoiceNo status total remainingBalance')
      .populate('recordedBy', 'name email')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: cheques.length, cheques });
  } catch (err) { next(err); }
};

exports.createCheque = async (req, res, next) => {
  try {
    const doc = await Cheque.create({
      ...req.body,
      recordedBy: req.user._id,
    });
    const populated = await Cheque.findById(doc._id)
      .populate('bankAccount', 'bankName accountNumber')
      .populate('recordedBy', 'name');
    res.status(201).json({ success: true, cheque: populated });
  } catch (err) { next(err); }
};

exports.updateCheque = async (req, res, next) => {
  try {
    const cheque = await Cheque.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('bankAccount', 'bankName accountNumber')
      .populate('recordedBy', 'name');
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    res.json({ success: true, cheque });
  } catch (err) { next(err); }
};

exports.deleteCheque = async (req, res, next) => {
  try {
    const c = await Cheque.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Cheque not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};
