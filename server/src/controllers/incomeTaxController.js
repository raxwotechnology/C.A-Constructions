const mongoose = require('mongoose');
const IncomeTaxConfig = require('../models/IncomeTaxConfig');
const EmployeeTaxProfile = require('../models/EmployeeTaxProfile');
const IncomeTaxRecord = require('../models/IncomeTaxRecord');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const { calculateMonthlyIncomeTax, getActiveTaxConfig } = require('../services/incomeTaxService');
const BankAccount = require('../models/BankAccount');
const { appendBankTransaction } = require('../utils/bankLedger');
const {
  parseRangeStart,
  parseRangeEnd,
  recordPeriodOverlapsRange,
  enumerateMonthsInRange,
} = require('../utils/incomeTaxDateRange');

const recordPopulate = [
  { path: 'employee', populate: { path: 'userId', select: 'name email' }, select: 'employeeNo department' },
  { path: 'config', select: 'name year' },
  { path: 'bankAccount', select: 'bankName accountNumber' },
  { path: 'remittedBy', select: 'name email' },
  { path: 'branch', select: 'name' },
  { path: 'payroll', select: 'month year netSalary status' },
];

async function findRecordById(id) {
  return IncomeTaxRecord.findById(id).populate(recordPopulate);
}

// ─── Config CRUD ─────────────────────────────────────────────────────────────
exports.listConfigs = async (req, res, next) => {
  try {
    const configs = await IncomeTaxConfig.find().sort({ year: -1, createdAt: -1 });
    res.json({ success: true, configs });
  } catch (err) { next(err); }
};

exports.createConfig = async (req, res, next) => {
  try {
    if (req.body.isActive) {
      await IncomeTaxConfig.updateMany({ year: req.body.year }, { isActive: false });
    }
    const config = await IncomeTaxConfig.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, config });
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    if (req.body.isActive) {
      const existing = await IncomeTaxConfig.findById(req.params.id);
      if (existing) await IncomeTaxConfig.updateMany({ year: existing.year, _id: { $ne: req.params.id } }, { isActive: false });
    }
    const config = await IncomeTaxConfig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });
    res.json({ success: true, config });
  } catch (err) { next(err); }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    await IncomeTaxConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

// ─── Employee profiles ───────────────────────────────────────────────────────
exports.listProfiles = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.year) q.year = Number(req.query.year);
    if (req.query.employeeId) q.employee = req.query.employeeId;
    const profiles = await EmployeeTaxProfile.find(q)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
    res.json({ success: true, profiles });
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await EmployeeTaxProfile.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) { next(err); }
};

exports.upsertProfile = async (req, res, next) => {
  try {
    const existing = req.params.id
      ? await EmployeeTaxProfile.findById(req.params.id)
      : null;

    const {
      employeeId: bodyEmployeeId,
      year: bodyYear,
      tin,
      taxResidency,
      employmentType,
      filingStatus,
      calculationMode,
      isExempt,
      exemptionReason,
      exemptions,
      effectiveFrom,
      notes,
    } = req.body;

    const employeeId = bodyEmployeeId || existing?.employee;
    const year = bodyYear != null ? bodyYear : existing?.year;

    if (!employeeId || year == null) {
      return res.status(400).json({ success: false, message: 'Employee and tax year are required' });
    }
    if (isExempt && !String(exemptionReason || '').trim()) {
      return res.status(400).json({ success: false, message: 'Exemption reason is required when tax exempt' });
    }

    const payload = {
      employee: employeeId,
      year: Number(year),
      tin: tin || '',
      taxResidency: taxResidency || 'resident',
      employmentType: employmentType || 'permanent',
      filingStatus: filingStatus || 'single',
      calculationMode: calculationMode || 'monthly',
      isExempt: !!isExempt,
      exemptionReason: isExempt ? String(exemptionReason || '').trim() : '',
      exemptions: exemptions || [],
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      notes: notes || '',
    };

    const filter = req.params.id && existing
      ? { _id: req.params.id }
      : { employee: employeeId, year: Number(year) };

    const profile = await EmployeeTaxProfile.findOneAndUpdate(
      filter,
      payload,
      { new: true, upsert: !req.params.id, runValidators: true },
    ).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
    res.json({ success: true, profile });
  } catch (err) { next(err); }
};

exports.deleteProfile = async (req, res, next) => {
  try {
    const profile = await EmployeeTaxProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, message: 'Tax profile deleted' });
  } catch (err) { next(err); }
};

// ─── Calculate / records ─────────────────────────────────────────────────────
exports.calculateForEmployee = async (req, res, next) => {
  try {
    const { employeeId, month, year, monthlyTaxableIncome } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const result = await calculateMonthlyIncomeTax(employee, Number(month), Number(year), Number(monthlyTaxableIncome || employee.basicSalary || 0));
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

async function generateRecordsForMonth(month, year, branch) {
  const empQuery = { status: 'active' };
  if (branch) empQuery.branch = branch;
  const employees = await Employee.find(empQuery);
  const results = [];
  for (const emp of employees) {
    const taxable = emp.basicSalary || 0;
    const calc = await calculateMonthlyIncomeTax(emp, month, year, taxable);
    const record = await IncomeTaxRecord.findOneAndUpdate(
      { employee: emp._id, month, year },
      {
        employee: emp._id,
        month,
        year,
        config: calc.config?._id,
        taxableIncome: calc.monthlyTaxable,
        taxAmount: calc.taxAmount,
        exemptionsApplied: (calc.exemptions || []).reduce((s, e) => s + Number(e.amount || 0), 0),
        branch: emp.branch,
        status: 'calculated',
      },
      { upsert: true, new: true },
    );
    results.push(record);
  }
  return results;
}

exports.generateMonthlyRecords = async (req, res, next) => {
  try {
    const { month, year, branch, fromDate, toDate } = req.body;

    if (fromDate && toDate) {
      const months = enumerateMonthsInRange(fromDate, toDate);
      if (!months.length) {
        return res.status(400).json({ success: false, message: 'Invalid date range' });
      }
      const all = [];
      for (const { month: m, year: y } of months) {
        const batch = await generateRecordsForMonth(m, y, branch);
        all.push(...batch);
      }
      return res.json({ success: true, count: all.length, records: all, monthsProcessed: months.length });
    }

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year required, or fromDate and toDate' });
    }
    const results = await generateRecordsForMonth(month, year, branch);
    res.json({ success: true, count: results.length, records: results });
  } catch (err) { next(err); }
};

exports.listRecords = async (req, res, next) => {
  try {
    const q = {};
    const from = parseRangeStart(req.query.fromDate);
    const to = parseRangeEnd(req.query.toDate);
    const useDateRange = Boolean(from || to);

    if (!useDateRange) {
      if (req.query.month) q.month = Number(req.query.month);
      if (req.query.year) q.year = Number(req.query.year);
    }
    if (req.query.branch) q.branch = req.query.branch;
    if (req.query.employeeId) q.employee = req.query.employeeId;

    let records = await IncomeTaxRecord.find(q)
      .populate(recordPopulate)
      .sort({ year: -1, month: -1 })
      .lean();

    if (useDateRange) {
      records = records.filter((r) => recordPeriodOverlapsRange(r, from, to));
    }

    res.json({ success: true, records, fromDate: req.query.fromDate, toDate: req.query.toDate });
  } catch (err) { next(err); }
};

exports.getRecord = async (req, res, next) => {
  try {
    const record = await findRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Tax record not found' });
    res.json({ success: true, record });
  } catch (err) { next(err); }
};

exports.updateRecord = async (req, res, next) => {
  try {
    const record = await IncomeTaxRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Tax record not found' });

    const { taxableIncome, taxAmount, exemptionsApplied, status, notes } = req.body;

    if (record.status === 'remitted') {
      if (notes !== undefined) record.notes = String(notes);
      if (
        taxableIncome != null
        || taxAmount != null
        || exemptionsApplied != null
        || (status && status !== 'remitted')
      ) {
        return res.status(400).json({
          success: false,
          message: 'Remitted records can only have notes updated. Delete is not available for remitted records.',
        });
      }
    } else {
      if (taxableIncome != null) record.taxableIncome = Math.max(0, Number(taxableIncome));
      if (taxAmount != null) record.taxAmount = Math.max(0, Number(taxAmount));
      if (exemptionsApplied != null) record.exemptionsApplied = Math.max(0, Number(exemptionsApplied));
      if (status && ['calculated', 'deducted', 'cancelled'].includes(status)) record.status = status;
      if (notes !== undefined) record.notes = String(notes);
    }

    await record.save();
    const populated = await findRecordById(record._id);
    res.json({ success: true, record: populated });
  } catch (err) { next(err); }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await IncomeTaxRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Tax record not found' });
    if (record.status === 'remitted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a remitted tax record (bank payment already posted)',
      });
    }
    await record.deleteOne();
    res.json({ success: true, message: 'Tax record deleted' });
  } catch (err) { next(err); }
};

exports.remitTaxPayment = async (req, res, next) => {
  try {
    const { recordIds, paymentMethod, bankAccount: rawBankAccount, date } = req.body;
    if (!Array.isArray(recordIds) || !recordIds.length) {
      return res.status(400).json({ success: false, message: 'recordIds required' });
    }

    const bankAccountId = rawBankAccount;
    if (!bankAccountId || !mongoose.Types.ObjectId.isValid(String(bankAccountId))) {
      return res.status(400).json({ success: false, message: 'Select the bank account to pay tax from' });
    }

    const payMethod = String(paymentMethod || 'bank_transfer').trim();
    const accountBefore = await BankAccount.findById(bankAccountId);
    if (!accountBefore) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    const records = await IncomeTaxRecord.find({ _id: { $in: recordIds }, status: { $ne: 'remitted' } })
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name' } });
    if (!records.length) {
      return res.status(400).json({ success: false, message: 'No pending tax records to remit' });
    }

    const total = records.reduce((s, r) => s + Number(r.taxAmount || 0), 0);
    if (total <= 0) return res.status(400).json({ success: false, message: 'No tax amount to remit' });

    const balanceBefore = Number(accountBefore.currentBalance || 0);
    if (balanceBefore < total) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available LKR ${balanceBefore.toLocaleString()}, required LKR ${total.toLocaleString()}`,
      });
    }

    const period = records[0];
    const refId = `TAX-REMIT-${period.year}-${String(period.month).padStart(2, '0')}-${Date.now().toString(36).slice(-4)}`;
    const updatedAccount = await appendBankTransaction(bankAccountId, {
      type: 'withdrawal',
      amount: total,
      description: `Income tax remittance — ${records.length} employee(s) via ${payMethod.replace(/_/g, ' ')}`,
      date: date || new Date(),
      moduleSource: 'income_tax',
      sourceType: 'TaxRemittance',
      sourceId: records[0]._id,
      referenceId: refId,
      paymentMethod: payMethod,
      recordedBy: req.user._id,
    });
    if (!updatedAccount) {
      return res.status(400).json({ success: false, message: 'Failed to post tax payment to bank ledger' });
    }

    await IncomeTaxRecord.updateMany(
      { _id: { $in: records.map((r) => r._id) } },
      {
        status: 'remitted',
        paymentMethod: payMethod,
        bankAccount: bankAccountId,
        remittedAt: date ? new Date(date) : new Date(),
        remittedBy: req.user._id,
      },
    );

    res.json({
      success: true,
      totalRemitted: total,
      count: records.length,
      bankDeducted: true,
      bankAccount: {
        _id: updatedAccount._id,
        bankName: updatedAccount.bankName,
        accountNumber: updatedAccount.accountNumber,
      },
      bankBalanceBefore: balanceBefore,
      bankBalanceAfter: updatedAccount.currentBalance,
      referenceId: refId,
    });
  } catch (err) { next(err); }
};

// ─── Reports ─────────────────────────────────────────────────────────────────
exports.getReport = async (req, res, next) => {
  try {
    const { type, month, year, branch, employeeId, fromDate, toDate } = req.query;
    const q = {};
    const from = parseRangeStart(fromDate);
    const to = parseRangeEnd(toDate);
    const useDateRange = Boolean(from || to);

    if (!useDateRange) {
      if (month) q.month = Number(month);
      if (year) q.year = Number(year);
    }
    if (branch) q.branch = branch;
    if (employeeId) q.employee = employeeId;

    let records = await IncomeTaxRecord.find(q)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' }, select: 'employeeNo department branch' })
      .populate('branch', 'name')
      .lean();

    if (useDateRange) {
      records = records.filter((r) => recordPeriodOverlapsRange(r, from, to));
    }

    const summary = {
      totalTax: records.reduce((s, r) => s + Number(r.taxAmount || 0), 0),
      totalTaxable: records.reduce((s, r) => s + Number(r.taxableIncome || 0), 0),
      count: records.length,
      remitted: records.filter((r) => r.status === 'remitted').length,
    };

    if (type === 'branch') {
      const byBranch = {};
      records.forEach((r) => {
        const key = String(r.branch?._id || r.branch || 'unassigned');
        if (!byBranch[key]) byBranch[key] = { branchName: r.branch?.name || 'Unassigned', totalTax: 0, count: 0 };
        byBranch[key].totalTax += Number(r.taxAmount || 0);
        byBranch[key].count += 1;
      });
      return res.json({ success: true, summary, groups: Object.values(byBranch), records });
    }

    if (type === 'yearly') {
      const byMonth = {};
      records.forEach((r) => {
        const key = `${r.year}-${r.month}`;
        if (!byMonth[key]) byMonth[key] = { month: r.month, year: r.year, totalTax: 0, count: 0 };
        byMonth[key].totalTax += Number(r.taxAmount || 0);
        byMonth[key].count += 1;
      });
      return res.json({ success: true, summary, groups: Object.values(byMonth), records });
    }

    res.json({ success: true, summary, records });
  } catch (err) { next(err); }
};

exports.exportReportData = async (req, res, next) => {
  try {
    req.query.type = req.query.type || 'monthly';
    return exports.getReport(req, res, next);
  } catch (err) { next(err); }
};
