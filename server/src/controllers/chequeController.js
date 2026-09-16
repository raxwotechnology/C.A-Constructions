const mongoose = require('mongoose');
const Cheque = require('../models/Cheque');
const { syncChequeBankLedger, reverseChequeBankLedger, statusNeedsBankLedger, isBouncedStatus } = require('../utils/chequeLedger');

function normalizeDirection(d) {
  const v = String(d || '').toLowerCase();
  if (v === 'incoming') return 'received';
  if (v === 'outgoing') return 'issued';
  return v;
}

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
    if (req.query.direction) q.direction = normalizeDirection(req.query.direction);
    if (req.query.branch) q.branch = req.query.branch;
    if (req.query.paymentType) q.paymentType = req.query.paymentType;
    if (req.query.fromDate || req.query.toDate) {
      q.chequeDate = {};
      if (req.query.fromDate) q.chequeDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) {
        const end = new Date(req.query.toDate);
        end.setHours(23, 59, 59, 999);
        q.chequeDate.$lte = end;
      }
    }

    const cheques = await Cheque.find(q)
      .populate('bankAccount', 'bankName accountNumber accountHolder branchName currentBalance')
      .populate('linkedSubscription', 'title subscriptionNo status nextDueDate')
      .populate('linkedInvoice', 'invoiceNo status total remainingBalance')
      .populate('recordedBy', 'name email')
      .populate('branch', 'name')
      .sort({ chequeDate: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, count: cheques.length, cheques });
  } catch (err) { next(err); }
};

exports.createCheque = async (req, res, next) => {
  try {
    const body = { ...req.body };
    body.direction = normalizeDirection(body.direction);
    if (!body.amount || Number(body.amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }
    if (!body.chequeNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Cheque number required' });
    }
    if (!body.bankAccount) body.bankAccount = undefined;

    const newStatus = String(body.status || 'pending').toLowerCase();
    if (statusNeedsBankLedger(newStatus, body.direction) && !body.bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Bank account is required when cheque status is paid, cleared, or deposited',
      });
    }

    const doc = await Cheque.create({
      ...body,
      recordedBy: req.user._id,
    });

    let ledgerAction = null;
    if (body.bankAccount && statusNeedsBankLedger(doc.status, doc.direction)) {
      ledgerAction = await syncChequeBankLedger(doc, { recordedBy: req.user._id });
    }

    const populated = await Cheque.findById(doc._id)
      .populate('bankAccount', 'bankName accountNumber currentBalance')
      .populate('recordedBy', 'name');
    res.status(201).json({ success: true, cheque: populated, ledgerAction });
  } catch (err) { next(err); }
};

exports.updateCheque = async (req, res, next) => {
  try {
    const cheque = await Cheque.findById(req.params.id);
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });

    const prevStatus = cheque.status;
    const updates = { ...req.body };
    if (updates.direction) updates.direction = normalizeDirection(updates.direction);
    if (updates.bankAccount === '') updates.bankAccount = undefined;

    const nextStatus = updates.status != null ? String(updates.status).toLowerCase() : cheque.status;
    const direction = updates.direction || cheque.direction;
    const bankId = updates.bankAccount || cheque.bankAccount;

    if (statusNeedsBankLedger(nextStatus, direction) && !bankId) {
      return res.status(400).json({
        success: false,
        message: 'Select a bank account before marking this cheque as paid or cleared',
      });
    }

    Object.assign(cheque, updates);
    if (updates.bankAccount) cheque.bankAccount = updates.bankAccount;
    await cheque.save();

    let ledgerAction = null;
    const needsLedger = statusNeedsBankLedger(cheque.status, cheque.direction);

    if (isBouncedStatus(nextStatus) && cheque.ledgerPosted) {
      ledgerAction = await reverseChequeBankLedger(cheque, { recordedBy: req.user._id });
    } else if (cheque.bankAccount && needsLedger && !cheque.ledgerPosted) {
      ledgerAction = await syncChequeBankLedger(cheque, { recordedBy: req.user._id });
    }

    const populated = await Cheque.findById(cheque._id)
      .populate('bankAccount', 'bankName accountNumber currentBalance')
      .populate('recordedBy', 'name');

    res.json({
      success: true,
      cheque: populated,
      ledgerAction,
      bankUpdated: Boolean(ledgerAction),
    });
  } catch (err) { next(err); }
};

exports.deleteCheque = async (req, res, next) => {
  try {
    const c = await Cheque.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Cheque not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};
