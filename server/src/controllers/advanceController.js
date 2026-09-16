const Advance = require('../models/Advance');
const Employee = require('../models/Employee');
const Cheque = require('../models/Cheque');
const { createNotification } = require('../services/notificationService');
const { appendBankTransaction, postsToBankLedger } = require('../utils/bankLedger');
const { requiresBankAccount, isChequeMethod, parseLedgerDate } = require('../utils/paymentMethods');
const { triggerPayrollSync, monthYearFromDate, attachSyncResult } = require('../utils/payrollSyncHook');
const { createAuditLog } = require('./auditController');

// GET /api/advances
exports.getAdvances = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    } else if (req.query.branch) {
      const emps = await Employee.find({ branch: req.query.branch }).select('_id');
      query.employee = { $in: emps.map(e => e._id) };
    }
    if (req.query.status) query.status = req.query.status;

    // Filter out non-staff / worker records if requesting staff salary advances
    if (req.query.onlyStaff === 'true' || req.query.category === 'office_employee') {
      query.recipientCategory = { $ne: 'baas_worker' };
    }

    const rawAdvances = await Advance.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } })
      .populate('bankAccount', 'bankName accountNumber branchName')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });

    // Filter out orphaned records without valid employee references
    const advances = rawAdvances.filter(a => a.employee && a.employee.userId && a.employee.userId.name);

    res.json({ success: true, count: advances.length, advances });
  } catch (err) { next(err); }
};

// DELETE /api/advances/cleanup-orphaned
exports.cleanupOrphanedAdvances = async (req, res, next) => {
  try {
    const validEmpIds = await Employee.find().distinct('_id');
    const result = await Advance.deleteMany({
      $or: [
        { employee: null },
        { employee: { $exists: false } },
        { employee: { $nin: validEmpIds } },
        { recipientCategory: 'baas_worker' },
      ],
    });
    res.json({
      success: true,
      message: `Successfully cleaned up ${result.deletedCount} orphaned/invalid advance records from database.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) { next(err); }
};

// GET /api/advances/employee-summary/:employeeId
exports.getEmployeeAdvanceSummary = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.employeeId).populate('userId', 'name email');
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const allAdvances = await Advance.find({ employee: req.params.employeeId }).sort({ date: -1 });
    const activeAdvances = allAdvances.filter(a => a.status === 'active');

    const previousAdvanceTotal = allAdvances.reduce((s, a) => s + (a.amount || 0), 0);
    const totalRecovered = allAdvances.reduce((s, a) => s + (a.totalRecovered || 0), 0);
    const remainingBalance = activeAdvances.reduce((s, a) => s + (a.outstandingBalance || 0), 0);
    const employeeAdvanceBalance = emp.advanceBalance || 0;

    res.json({
      success: true,
      summary: {
        name: emp.userId?.name,
        employeeNo: emp.employeeNo,
        basicSalary: emp.basicSalary || 0,
        allowances: emp.allowances || 0,
        previousAdvanceTotal,
        totalRecovered,
        remainingBalance,
        availableAdvanceBalance: employeeAdvanceBalance,
        employeeAdvanceBalance,
        activeAdvancesCount: activeAdvances.length,
        activeAdvances: activeAdvances.map(a => ({
          _id: a._id,
          amount: a.amount,
          outstandingBalance: a.outstandingBalance,
          monthlyDeduction: a.monthlyDeduction,
          date: a.date,
          reason: a.reason,
        })),
      },
    });
  } catch (err) { next(err); }
};

// POST /api/advances
exports.createAdvance = async (req, res, next) => {
  try {
    const {
      recipientCategory, workerName, project,
      employeeId, amount, date, reason, repaymentType, installments,
      paymentMethod, bankAccount, paymentReference, chequeNumber,
    } = req.body;
    const amt = Number(amount);
    const cat = 'office_employee'; // Strictly Staff/Employee Salary Advance

    // Mandatory Employee Selection Validation
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee selection is strictly required for Salary Advances' });
    }
    const empExists = await Employee.findById(employeeId);
    if (!empExists) {
      return res.status(400).json({ success: false, message: 'Selected Employee was not found in database' });
    }

    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid advance amount is required' });
    }

    const method = paymentMethod || 'cash';
    if (requiresBankAccount(method) && !bankAccount) {
      return res.status(400).json({ success: false, message: 'Bank account is required for bank transfer or cheque payments' });
    }
    if (isChequeMethod(method) && !String(chequeNumber || '').trim()) {
      return res.status(400).json({ success: false, message: 'Cheque number is required for cheque payments' });
    }

    const inst = Number(installments) || 1;
    const payDate = parseLedgerDate(date);
    const advance = await Advance.create({
      recipientCategory: cat,
      employee: employeeId,
      workerName: workerName || '',
      project: project || undefined,
      amount: amt,
      outstandingBalance: amt,
      date: payDate,
      reason: reason || '',
      repaymentType: repaymentType || 'lump_sum',
      installments: inst,
      monthlyDeduction: repaymentType === 'installments' && inst > 1 ? Math.ceil(amt / inst) : amt,
      paymentMethod: method,
      bankAccount: bankAccount || undefined,
      paymentReference: paymentReference || '',
      chequeNumber: isChequeMethod(method) ? String(chequeNumber).trim() : '',
      recordedBy: req.user._id,
    });

    // Auto-link Baas Worker Advances to Site Expense
    if (cat === 'baas_worker' && project) {
      const FinanceEntry = require('../models/FinanceEntry');
      await FinanceEntry.create({
        transactionNo: 'ADV-W-' + Date.now().toString().slice(-6),
        project: project,
        title: `Worker Advance: ${workerName || 'Baas Worker'} (${reason || 'Site Advance'})`,
        amount: amt,
        type: 'expense',
        transactionType: 'Expense',
        masterCategory: 'Direct Construction Expenses',
        category: 'Daily Wages',
        payeeOrPayer: workerName || 'Baas Worker',
        paymentMethod: method === 'cash' ? 'Cash' : 'Bank Transfer',
        date: payDate,
      }).catch(e => console.warn('Failed to auto-create Site FinanceEntry for worker advance:', e.message));
    }

    let emp = null;
    if (employeeId) {
      emp = await Employee.findByIdAndUpdate(
        employeeId,
        { $inc: { advanceBalance: amt } },
        { new: true }
      ).populate('userId', 'name _id');
    }

    if (postsToBankLedger(method) && bankAccount) {
      const empName = emp?.userId?.name || 'Employee';
      const ref = isChequeMethod(method) ? String(chequeNumber).trim() : (paymentReference || `ADV-${advance._id}`);
      await appendBankTransaction(bankAccount, {
        type: 'withdrawal',
        amount: amt,
        description: `Advance payment — ${empName}${reason ? `: ${reason}` : ''}`,
        date: payDate,
        referenceId: ref,
        moduleSource: 'advances',
        sourceType: 'Advance',
        sourceId: advance._id,
        recordedBy: req.user._id,
        paymentMethod: method,
      });

      if (isChequeMethod(method)) {
        await Cheque.create({
          direction: 'issued',
          source: 'payroll',
          status: 'cleared',
          amount: amt,
          currency: 'LKR',
          chequeNumber: String(chequeNumber).trim(),
          chequeDate: payDate,
          drawerOrPayee: empName,
          bankAccount,
          notes: `Advance: ${reason || 'Employee advance'}`,
          recordedBy: req.user._id,
        }).catch((e) => console.warn('[Advance] Cheque record:', e.message));
      }
    }

    if (emp?.userId?._id) {
      await createNotification({
        recipient: emp.userId._id,
        title: 'Advance Payment Recorded',
        message: `An advance of LKR ${amt.toLocaleString()} has been recorded on your account. ${repaymentType === 'installments' ? `Monthly deduction: LKR ${Math.ceil(amt / inst).toLocaleString()} for ${inst} months.` : 'To be recovered as lump sum.'}`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    const populated = await Advance.findById(advance._id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('bankAccount', 'bankName accountNumber branchName');

    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'financial',
      entityId: advance._id,
      entityName: `Advance — ${emp?.userId?.name || 'Employee'}`,
      description: `Advance LKR ${amt.toLocaleString()} via ${method}`,
      changes: { after: { amount: amt, paymentMethod: method, bankAccount, chequeNumber } },
    });

    const period = monthYearFromDate(advance.date);
    const sync = await triggerPayrollSync({
      employeeId,
      month: period.month,
      year: period.year,
      source: 'advance',
      module: 'advances',
      entityId: advance._id,
      reason: 'Advance created',
      user: req.user,
    });

    res.status(201).json(attachSyncResult({ success: true, advance: populated }, sync));
  } catch (err) { next(err); }
};

// POST /api/advances/:id/repay
exports.recordRepayment = async (req, res, next) => {
  try {
    const { amount, date, note, payrollId } = req.body;
    const advance = await Advance.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });

    const repayAmt = Number(amount);
    advance.repayments.push({ amount: repayAmt, date: date || new Date(), payrollId, note });
    advance.totalRecovered = (advance.totalRecovered || 0) + repayAmt;
    advance.outstandingBalance = Math.max(0, advance.amount - advance.totalRecovered);
    const justCleared = advance.outstandingBalance === 0;
    if (justCleared) advance.status = 'cleared';
    await advance.save();

    await Employee.findByIdAndUpdate(advance.employee._id || advance.employee, { $inc: { advanceBalance: -repayAmt } });

    const recipientId = advance.employee?.userId?._id;
    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        title: justCleared ? 'Advance Fully Cleared ✅' : 'Advance Repayment Recorded',
        message: justCleared
          ? `Your advance of LKR ${advance.amount.toLocaleString()} has been fully cleared.`
          : `Advance repayment of LKR ${repayAmt.toLocaleString()} recorded. Outstanding: LKR ${advance.outstandingBalance.toLocaleString()}.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    const period = monthYearFromDate(date || new Date());
    const sync = await triggerPayrollSync({
      employeeId: advance.employee._id || advance.employee,
      month: period.month,
      year: period.year,
      source: 'advance',
      module: 'advances',
      entityId: advance._id,
      reason: 'Advance repayment',
      user: req.user,
    });

    res.json(attachSyncResult({ success: true, advance }, sync));
  } catch (err) { next(err); }
};

// GET /api/advances/:id
exports.getAdvance = async (req, res, next) => {
  try {
    const advance = await Advance.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } })
      .populate('bankAccount', 'bankName accountNumber branchName')
      .populate('recordedBy', 'name');
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });
    res.json({ success: true, advance });
  } catch (err) { next(err); }
};

// PUT /api/advances/:id
exports.updateAdvance = async (req, res, next) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });

    const { reason, repaymentType, installments, date } = req.body;
    if (reason !== undefined) advance.reason = reason;
    if (repaymentType !== undefined) advance.repaymentType = repaymentType;
    if (installments !== undefined) advance.installments = Number(installments) || 1;
    if (date !== undefined) advance.date = parseLedgerDate(date);

    await advance.save();

    const populated = await Advance.findById(advance._id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('bankAccount', 'bankName accountNumber branchName')
      .populate('recordedBy', 'name');

    await createAuditLog({
      user: req.user,
      action: 'update',
      module: 'financial',
      entityId: advance._id,
      entityName: `Advance — ${populated.employee?.userId?.name || 'Employee'}`,
      description: 'Advance record updated',
    });

    res.json({ success: true, advance: populated });
  } catch (err) { next(err); }
};

// DELETE /api/advances/:id
exports.deleteAdvance = async (req, res, next) => {
  try {
    const advance = await Advance.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name' } });
    if (!advance) return res.status(404).json({ success: false, message: 'Not found' });

    const reversalAmt = Number(advance.amount || 0);
    if (postsToBankLedger(advance.paymentMethod) && advance.bankAccount && reversalAmt > 0) {
      const empName = advance.employee?.userId?.name || 'Employee';
      await appendBankTransaction(advance.bankAccount, {
        type: 'deposit',
        amount: reversalAmt,
        description: `Advance reversal (deleted) — ${empName}`,
        date: parseLedgerDate(advance.date),
        referenceId: `ADV-REV-${advance._id}`,
        moduleSource: 'advances',
        sourceType: 'Advance',
        sourceId: advance._id,
        recordedBy: req.user?._id,
        paymentMethod: advance.paymentMethod,
      });
    }

    await Employee.findByIdAndUpdate(advance.employee._id || advance.employee, {
      $inc: { advanceBalance: -advance.outstandingBalance },
    });

    await createAuditLog({
      user: req.user,
      action: 'delete',
      module: 'financial',
      entityId: advance._id,
      entityName: `Advance — ${advance.employee?.userId?.name || 'Employee'}`,
      description: `Deleted advance LKR ${advance.amount?.toLocaleString()} (outstanding LKR ${advance.outstandingBalance?.toLocaleString()})`,
      changes: { before: advance.toObject() },
      severity: 'warning',
    });

    const empId = advance.employee._id || advance.employee;
    const period = monthYearFromDate();
    await advance.deleteOne();
    const sync = await triggerPayrollSync({
      employeeId: empId,
      month: period.month,
      year: period.year,
      source: 'advance',
      module: 'advances',
      entityId: req.params.id,
      reason: 'Advance deleted',
      user: req.user,
    });
    res.json(attachSyncResult({ success: true, message: 'Advance deleted' }, sync));
  } catch (err) { next(err); }
};
