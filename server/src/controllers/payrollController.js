const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Overtime = require('../models/Overtime');
const SalaryPayment = require('../models/SalaryPayment');
const Project = require('../models/Project');
const crypto = require('crypto');
const { createNotification } = require('../services/notificationService');
const EpfRecord = require('../models/EpfRecord');
const Loan = require('../models/Loan');
const AuditLog = require('../models/AuditLog');

// Internal audit logging helper (does not throw)
const createAuditLog = async ({ user, action, module, entityId, entityName, description, severity = 'info' }) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userName: user?.name || 'System',
      userRole: user?.role || 'system',
      action, module,
      entityId: entityId ? String(entityId) : '',
      entityName: entityName || '',
      description: description || '',
      severity,
    });
  } catch (_) { /* never crash on audit log failure */ }
};

// EPF/ETF rates (Sri Lanka)
const EPF_EMPLOYEE = 0.08;
const EPF_EMPLOYER = 0.12;
const ETF_EMPLOYER = 0.03;
const COMMISSION_RATE = Number(process.env.PAYROLL_COMMISSION_RATE || 0.05);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const monthRange = (month, year) => ({
  start: new Date(Number(year), Number(month) - 1, 1),
  end: new Date(Number(year), Number(month), 0, 23, 59, 59, 999),
});

async function computeAutoCommission(employeeId, month, year) {
  const { start, end } = monthRange(month, year);
  const completedProjects = await Project.find({
    status: 'completed',
    completedAt: { $gte: start, $lte: end },
    assignedEmployees: employeeId,
  }).select('title budget assignedEmployees');
  const autoCommission = completedProjects.reduce((sum, project) => {
    const members = Math.max((project.assignedEmployees || []).length, 1);
    const pool = Number(project.budget || 0) * COMMISSION_RATE;
    return sum + (pool / members);
  }, 0);
  return { autoCommission, completedProjects };
}

// @desc    Generate monthly payroll
// @route   POST /api/payroll/generate
exports.generatePayroll = async (req, res, next) => {
  try {
    const { month, year, employeeId, allowances = 0, overtime = 0, commissions = 0, bonus = 0, deductions = 0, loanDeduction: manualLoan = 0, leaveDeduction = 0, notes } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Auto-calculate Loan Deduction
    const activeLoans = await Loan.find({ employee: employeeId, status: 'active', deductionType: 'salary' });
    const autoLoanDeduct = activeLoans.reduce((sum, l) => sum + (l.monthlyInstallment || 0), 0);
    const loanDeduction = manualLoan || autoLoanDeduct;
    const deductedLoans = activeLoans.map(l => l._id);

    // Auto-calculate Overtime
    const otRecords = await Overtime.find({ employee: employeeId, month, year });
    const autoOtPay = otRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const autoOtHours = otRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
    const otPay = overtime || autoOtPay;
    const otHours = autoOtHours;

    // Check if payroll already exists
    const exists = await Payroll.findOne({ employee: employeeId, month, year });
    if (exists && exists.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot regenerate a payroll that is already marked as PAID' });
    }

    const basicSalary = employee.basicSalary || 0;

    // ── Auto-pull project salary allocations for this employee ──
    const { start, end } = monthRange(month, year);
    const assignedProjects = await Project.find({
      $or: [
        { assignedEmployees: employee.userId },
        { 'salaryAllocations.employee': employeeId }
      ],
      status: { $in: ['active', 'completed'] },
      startDate: { $lte: end },
    });

    let projectSalaryAlloc = 0;
    let projectCommissionAlloc = 0;
    assignedProjects.forEach(proj => {
      const alloc = (proj.salaryAllocations || []).find(
        a => String(a.employee) === String(employeeId)
      );
      if (alloc) {
        projectSalaryAlloc += Number(alloc.amount || 0);
        projectCommissionAlloc += Number(alloc.commission || 0);
      }
    });

    // Manual commission + auto commission from completed projects
    const { autoCommission } = await computeAutoCommission(employeeId, month, year);
    const totalCommissions = Number(commissions) + autoCommission + projectCommissionAlloc;

    // OT records
    const otRows = await Overtime.find({ employee: employeeId, month, year });
    const overtimeTotal = otRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const finalOvertime = Number(overtime) + overtimeTotal;

    const grossSalary = basicSalary + projectSalaryAlloc + Number(allowances) + finalOvertime + totalCommissions + Number(bonus);

    // EPF/ETF calculations — only for enrolled employees
    const epfEmployee = employee.epfEtfEnrolled ? Math.round(basicSalary * EPF_EMPLOYEE) : 0;
    const epfEmployer = employee.epfEtfEnrolled ? Math.round(basicSalary * EPF_EMPLOYER) : 0;
    const etfEmployer = employee.epfEtfEnrolled ? Math.round(basicSalary * ETF_EMPLOYER) : 0;
    const totalDeductions = Number(deductions) + Number(loanDeduction) + Number(leaveDeduction) + epfEmployee;
    const netSalary = grossSalary - totalDeductions;

    const payload = {
      employee: employeeId, month, year,
      basicSalary, allowances: Number(allowances) + projectSalaryAlloc,
      overtime: finalOvertime, commissions: totalCommissions, bonus, deductions: Number(deductions), loanDeduction,
      deductedLoans,
      leaveDeduction: Number(leaveDeduction), leaveDeductionDays: 0,
      epfEmployee, epfEmployer, etfEmployer,
      grossSalary, totalDeductions, netSalary,
      generatedBy: req.user._id, notes,
      status: 'draft',
    };

    let payroll;
    if (exists) {
      payroll = await Payroll.findByIdAndUpdate(exists._id, payload, { new: true });
    } else {
      payroll = await Payroll.create(payload);
    }

    await payroll.populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });


    await createNotification({
      recipient: payroll.employee.userId?._id,
      title: 'Payroll Generated',
      message: `Your payroll for ${month}/${year} has been generated (status: draft). EPF (employee): LKR ${Number(payroll.epfEmployee || 0).toLocaleString()}, EPF (employer): LKR ${Number(payroll.epfEmployer || 0).toLocaleString()}, ETF (employer): LKR ${Number(payroll.etfEmployer || 0).toLocaleString()}.`,
      type: 'payroll',
      link: '/developer/payslips',
    });

    
    await createAuditLog({
      user: req.user, action: 'create', module: 'payroll', entityId: payroll._id, entityName: `Payroll ${month}/${year}`,
      description: `Generated payroll for employee ${employeeId}`,
    });

    res.status(201).json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Generate payroll for ALL employees
// @route   POST /api/payroll/generate-all
exports.generateAllPayroll = async (req, res, next) => {
  try {
    const { month, year, branch } = req.body;
    const query = { status: 'active' };
    if (branch) query.branch = branch;
    const employees = await Employee.find(query);
    const results = [];
    const errors = [];

    for (const emp of employees) {
      try {
        const exists = await Payroll.findOne({ employee: emp._id, month, year });
        if (exists && exists.status === 'paid') { errors.push({ employeeId: emp._id, message: 'Already paid' }); continue; }

        const basicSalary = emp.basicSalary;
        const allowances = emp.allowances || 0;
        
        // Auto-calculate Loan Deduction
        const activeLoans = await Loan.find({ employee: emp._id, status: 'active', deductionType: 'salary' });
        const loanDeduction = activeLoans.reduce((sum, l) => sum + (l.monthlyInstallment || 0), 0);
        const deductedLoans = activeLoans.map(l => l._id);

        // Auto-calculate Overtime
        const otRows = await Overtime.find({ employee: emp._id, month, year });
        const overtime = otRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const otHours = otRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);

        const { autoCommission } = await computeAutoCommission(emp._id, month, year);
        const grossSalary = basicSalary + allowances + overtime + autoCommission;
        
        const epfEmployee = emp.epfEtfEnrolled ? Math.round(basicSalary * EPF_EMPLOYEE) : 0;
        const epfEmployer = emp.epfEtfEnrolled ? Math.round(basicSalary * EPF_EMPLOYER) : 0;
        const etfEmployer = emp.epfEtfEnrolled ? Math.round(basicSalary * ETF_EMPLOYER) : 0;
        
        const totalDeductions = loanDeduction + epfEmployee;
        const netSalary = grossSalary - totalDeductions;

        const payload = {
          employee: emp._id, month, year,
          basicSalary, allowances, 
          otHours, overtime, 
          commissions: autoCommission, 
          loanDeduction, deductedLoans,
          epfEmployee, epfEmployer, etfEmployer,
          grossSalary, totalDeductions, netSalary,
          generatedBy: req.user._id,
          status: 'draft',
        };

        let payroll;
        if (exists) {
          payroll = await Payroll.findByIdAndUpdate(exists._id, payload, { new: true });
        } else {
          payroll = await Payroll.create(payload);
        }
        results.push(payroll);
      } catch (e) {
        errors.push({ employeeId: emp._id, message: e.message });
      }
    }
    
    await createAuditLog({
      user: req.user, action: 'create', module: 'payroll',
      description: `Generated payroll batch for ${results.length} employees (${month}/${year})`,
    });
    res.status(201).json({ success: true, generated: results.length, errors, results });
  } catch (err) { next(err); }
};

// @desc    Get payroll list
// @route   GET /api/payroll
exports.getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employee, status, branch } = req.query;
    let query = {};
    if (month) query.month = month;
    if (year) query.year = year;
    if (status) query.status = status;
    if (employee) {
      query.employee = employee;
    } else if (branch) {
      const emps = await Employee.find({ branch }).select('_id');
      if (emps.length > 0) {
        query.employee = { $in: emps.map(e => e._id) };
      } else {
        query.employee = null; // No employees for this branch
      }
    }

    const payrolls = await Payroll.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
      .populate('deductedLoans')
      .sort({ year: -1, month: -1 });
    res.json({ success: true, count: payrolls.length, payrolls });
  } catch (err) { next(err); }
};

// @desc    Get my payslips
// @route   GET /api/payroll/my
exports.getMyPayrolls = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const payrolls = await Payroll.find({ employee: employee._id }).populate('deductedLoans').sort({ year: -1, month: -1 });
    res.json({ success: true, payrolls });
  } catch (err) { next(err); }
};

// @desc    Review payroll (draft → reviewed)
// @route   PUT /api/payroll/:id/review
exports.reviewPayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'reviewed', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: '_id name' } });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });

    // Notify admins that this payroll is ready to approve
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map(a => createNotification({
      recipient: a._id,
      title: 'Payroll Ready for Approval',
      message: `Payroll for ${payroll.employee?.userId?.name} (${payroll.month}/${payroll.year}) has been reviewed and is awaiting approval.`,
      type: 'payroll',
      link: '/admin/payroll',
    })));

    res.json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Approve payroll (reviewed → approved)
// @route   PUT /api/payroll/:id/approve
exports.approvePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: '_id name' } });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });

    // Notify employee: payroll approved, payment incoming
    if (payroll.employee?.userId?._id) {
      await createNotification({
        recipient: payroll.employee.userId._id,
        title: 'Payroll Approved 🎉',
        message: `Your payroll for ${payroll.month}/${payroll.year} has been approved. Net salary: LKR ${Number(payroll.netSalary || 0).toLocaleString()}. Payment is being processed.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Update payroll (draft/reviewed only)
// @route   PUT /api/payroll/:id
exports.updatePayroll = async (req, res, next) => {
  try {
    const existing = await Payroll.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Payroll not found' });
    if (existing.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot edit a paid payroll' });

    const {
      allowances, otHours, otRate, otMultiplier, bonus, bonusNote,
      commissions, advanceDeduction, loanDeduction, notes, paymentMethod,
      otherAdditions, otherDeductions,
    } = req.body;

    const basic = existing.basicSalary;
    const mult = Number(otMultiplier || existing.otMultiplier || 1.5);
    const rate = Number(otRate || existing.otRate || 0);
    const hours = Number(otHours ?? existing.otHours ?? 0);
    const otPay = parseFloat((hours * rate * mult).toFixed(2));

    const addOthers = (otherAdditions || existing.otherAdditions || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const dedOthers = (otherDeductions || existing.otherDeductions || []).reduce((s, i) => s + Number(i.amount || 0), 0);

    const grossSalary = basic
      + Number(allowances ?? existing.allowances ?? 0)
      + otPay
      + Number(bonus ?? existing.bonus ?? 0)
      + Number(commissions ?? existing.commissions ?? 0)
      + addOthers;

    const employee = await Employee.findById(existing.employee);
    const epfEmployee = employee?.epfEtfEnrolled ? Math.round(basic * EPF_EMPLOYEE) : 0;
    const epfEmployer = employee?.epfEtfEnrolled ? Math.round(basic * EPF_EMPLOYER) : 0;
    const etfEmployer = employee?.epfEtfEnrolled ? Math.round(basic * ETF_EMPLOYER) : 0;

    const totalDeductions = epfEmployee
      + Number(advanceDeduction ?? existing.advanceDeduction ?? 0)
      + Number(loanDeduction ?? existing.loanDeduction ?? 0)
      + dedOthers;

    const netSalary = grossSalary - totalDeductions;

    const updated = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        allowances: allowances ?? existing.allowances,
        otHours: hours, otRate: rate, otMultiplier: mult, otPay,
        bonus: bonus ?? existing.bonus,
        bonusNote: bonusNote ?? existing.bonusNote,
        commissions: commissions ?? existing.commissions,
        advanceDeduction: advanceDeduction ?? existing.advanceDeduction,
        loanDeduction: loanDeduction ?? existing.loanDeduction,
        notes: notes ?? existing.notes,
        paymentMethod: paymentMethod ?? existing.paymentMethod,
        otherAdditions: otherAdditions ?? existing.otherAdditions,
        otherDeductions: otherDeductions ?? existing.otherDeductions,
        epfEmployee, epfEmployer, etfEmployer,
        grossSalary, totalDeductions, netSalary,
        status: 'draft', // reset to draft after edit
      },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });

    res.json({ success: true, payroll: updated });
  } catch (err) { next(err); }
};

// @desc    Mark payroll as paid
exports.markPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date(), bankAccount: req.body.bankAccount || undefined, paymentMethod: req.body.paymentMethod || undefined }, { new: true })
      .populate({ path: 'employee', populate: { path: 'userId', select: '_id name email' } });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });

    await createNotification({
      recipient: payroll.employee?.userId?._id,
      title: 'Salary Credited',
      message: `Salary credited for ${payroll.month}/${payroll.year}. Net: LKR ${Number(payroll.netSalary || 0).toLocaleString()}`,
      type: 'payroll',
      link: '/developer/payslips',
    });

    // Sync with EpfRecord
    await EpfRecord.findOneAndUpdate(
      { employee: payroll.employee?._id, month: payroll.month, year: payroll.year },
      { isPaid: true, paidAt: new Date(), paidBy: req.user._id }
    );

    // Sync with Loan Payments
    if (payroll.loanDeduction > 0 && payroll.deductedLoans?.length > 0) {
      for (const loanId of payroll.deductedLoans) {
        const loan = await Loan.findById(loanId);
        if (loan && loan.status === 'active') {
          const installment = loan.monthlyInstallment || 0;
          loan.payments.push({
            amount: installment,
            date: new Date(),
            payrollId: payroll._id,
            note: `Auto-deducted from ${MONTHS[payroll.month - 1]} payroll`,
            method: 'salary_deduction'
          });
          loan.totalPaid = (loan.totalPaid || 0) + installment;
          loan.installmentsPaid = (loan.installmentsPaid || 0) + 1;
          loan.outstandingBalance = Math.max(0, loan.totalAmount - loan.totalPaid);
          if (loan.outstandingBalance === 0) loan.status = 'cleared';
          await loan.save();
          
          // Also update employee's total loan balance
          await Employee.findByIdAndUpdate(payroll.employee._id, { $inc: { loanBalance: -installment } });
        }
      }
    }

    // Sync with Bank Account
    if (payroll.bankAccount && ['bank_transfer', 'card_payment', 'online_transfer', 'payhere'].includes(payroll.paymentMethod)) {
      const BankAccount = require('../models/BankAccount');
      const account = await BankAccount.findById(payroll.bankAccount);
      if (account) {
        account.currentBalance = (account.currentBalance || 0) - (payroll.netSalary || 0);
        account.transactions.push({
          type: 'withdrawal',
          amount: payroll.netSalary || 0,
          balanceAfter: account.currentBalance,
          description: `Payroll: ${payroll.employee?.userId?.name} (${payroll.month}/${payroll.year})`,
          date: new Date(),
          recordedBy: req.user._id,
        });
        await account.save();
      }
    }
    
    await createAuditLog({
      user: req.user, action: 'pay', module: 'payroll', entityId: payroll._id, entityName: `Payroll ${payroll.month}/${payroll.year}`,
      description: `Marked payroll as paid for ${payroll.employee?.userId?.name}`,
    });

    res.json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Get EPF/ETF summary — all enrolled employees (with or without payroll)
// @route   GET /api/payroll/epf-summary
exports.getEpfSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const enrolledEmployees = await Employee.find({
      epfEtfEnrolled: true,
      status: { $nin: ['former', 'terminated', 'intern_ended'] },
    }).populate('userId', 'name email');

    const enrolledIds = enrolledEmployees.map(e => e._id);
    const payrollQuery = { employee: { $in: enrolledIds } };
    if (month) payrollQuery.month = Number(month);
    if (year)  payrollQuery.year  = Number(year);

    const payrolls = await Payroll.find(payrollQuery);
    const payrollMap = {};
    payrolls.forEach(p => { payrollMap[String(p.employee)] = p; });

    const summary = enrolledEmployees.map(emp => {
      const p           = payrollMap[String(emp._id)];
      const basicSalary = p ? p.basicSalary : (emp.basicSalary || 0);
      const epfEmployee = p ? p.epfEmployee : Math.round(basicSalary * EPF_EMPLOYEE);
      const epfEmployer = p ? p.epfEmployer : Math.round(basicSalary * EPF_EMPLOYER);
      const etfEmployer = p ? p.etfEmployer : Math.round(basicSalary * ETF_EMPLOYER);
      return {
        employeeId: String(emp._id),
        payrollId:  p?._id ? String(p._id) : null,
        employeeNo: emp.employeeNo,
        name:       emp.userId?.name,
        epfNo:      emp.epfNumber,
        etfNo:      emp.etfNumber,
        basicSalary,
        epfEmployee,
        epfEmployer,
        totalEPF:   epfEmployee + epfEmployer,
        etfEmployer,
        isPaid:     p?.status === 'paid',
        paidAt:     p?.paidAt || null,
        hasPayroll: !!p,
      };
    });

    const totals = {
      epfEmployee: summary.reduce((a, b) => a + b.epfEmployee, 0),
      epfEmployer: summary.reduce((a, b) => a + b.epfEmployer, 0),
      totalEPF:    summary.reduce((a, b) => a + b.totalEPF,    0),
      etfEmployer: summary.reduce((a, b) => a + b.etfEmployer, 0),
    };

    res.json({ success: true, summary, totals });
  } catch (err) { next(err); }
};

// @desc    Edit EPF/ETF amounts on an existing payroll record
// @route   PUT /api/payroll/:id/epf
exports.updateEpfRecord = async (req, res, next) => {
  try {
    const existing = await Payroll.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });
    const epfEmployee = req.body.epfEmployee ?? existing.epfEmployee;
    const epfEmployer = req.body.epfEmployer ?? existing.epfEmployer;
    const etfEmployer = req.body.etfEmployer ?? existing.etfEmployer;
    const newNet = existing.netSalary - (epfEmployee - existing.epfEmployee);
    const updated = await Payroll.findByIdAndUpdate(
      req.params.id,
      { epfEmployee, epfEmployer, etfEmployer, netSalary: newNet },
      { new: true }
    );
    res.json({ success: true, payroll: updated });
  } catch (err) { next(err); }
};

// @desc    Delete a payroll / EPF record
// @route   DELETE /api/payroll/:id
exports.deletePayroll = async (req, res, next) => {
  try {
    const rec = await Payroll.findByIdAndDelete(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });
    
    await createAuditLog({
      user: req.user, action: 'delete', module: 'payroll', entityId: rec._id, entityName: `Payroll deleted`,
      description: `Deleted payroll record ${rec._id} (${rec.month}/${rec.year})`,
    });
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { next(err); }
};



// @desc    Add overtime for selected employee/month
// @route   POST /api/payroll/overtime
exports.addOvertime = async (req, res, next) => {
  try {
    const { employeeId, month, year, amount, hours = 0, note = '' } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const row = await Overtime.create({
      employee: employeeId,
      month,
      year,
      amount: Number(amount || 0),
      hours: Number(hours || 0),
      note,
      addedBy: req.user._id,
    });

    res.status(201).json({ success: true, overtime: row });
  } catch (err) { next(err); }
};

// @desc    Get overtime rows
// @route   GET /api/payroll/overtime
exports.getOvertime = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.query;
    const q = {};
    if (month) q.month = Number(month);
    if (year) q.year = Number(year);
    if (employeeId) q.employee = employeeId;

    const records = await Overtime.find(q)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) { next(err); }
};

// @desc    Initiate salary payment via PayHere (admin)
// @route   POST /api/payroll/:id/payhere/init
exports.initiateSalaryPayHere = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate({ path: 'employee', populate: { path: 'userId', select: 'name email phone _id' } });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;
    const amount = Number(payroll.netSalary || 0).toFixed(2);
    const currency = 'LKR';
    const orderId = `SAL-${payroll._id}-${Date.now()}`;
    const sandbox = process.env.NODE_ENV !== 'production';

    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawHash = `${merchantId}${orderId}${amount}${currency}${secretHash}`;
    const hash = crypto.createHash('md5').update(rawHash).digest('hex').toUpperCase();

    await SalaryPayment.create({
      payroll: payroll._id,
      employee: payroll.employee._id,
      user: payroll.employee.userId._id,
      amount: payroll.netSalary,
      currency,
      payhere_order_id: orderId,
      status: 'pending',
    });

    res.json({
      success: true,
      paymentData: {
        sandbox,
        merchant_id: merchantId,
        return_url: `${process.env.CLIENT_URL}/admin/payroll?payment=success`,
        cancel_url: `${process.env.CLIENT_URL}/admin/payroll?payment=cancelled`,
        notify_url: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payroll/payhere/notify`,
        order_id: orderId,
        items: `Salary ${payroll.month}/${payroll.year} - ${payroll.employee.userId.name}`,
        amount,
        currency,
        first_name: payroll.employee.userId.name.split(' ')[0] || payroll.employee.userId.name,
        last_name: payroll.employee.userId.name.split(' ').slice(1).join(' ') || '-',
        email: payroll.employee.userId.email || 'salary@raxwo.com',
        phone: payroll.employee.userId.phone || '0000000000',
        address: 'Colombo',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Handle salary payment PayHere webhook
// @route   POST /api/payroll/payhere/notify
exports.salaryPayHereNotify = async (req, res, next) => {
  try {
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
    const merchantSecret = process.env.PAYHERE_SECRET;
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawHash = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`;
    const localSig = crypto.createHash('md5').update(rawHash).digest('hex').toUpperCase();
    if (localSig !== md5sig) return res.status(400).json({ success: false, message: 'Invalid signature' });

    if (status_code === '2') {
      const payment = await SalaryPayment.findOneAndUpdate(
        { payhere_order_id: order_id },
        { status: 'completed', paidAt: new Date(), payhere_payment_id: req.body.payment_id, payhere_status_code: status_code, md5sig },
        { new: true }
      ).populate({ path: 'employee', populate: { path: 'userId', select: '_id name' } });

      if (payment) {
        const payroll = await Payroll.findByIdAndUpdate(payment.payroll, { status: 'paid', paidAt: new Date() }, { new: true });
        if (payroll) {
          await createNotification({
            recipient: payment.employee.userId._id,
            title: 'Salary Credited',
            message: `Salary credited for ${payroll.month}/${payroll.year}. Net: LKR ${Number(payroll.netSalary || 0).toLocaleString()}`,
            type: 'payroll',
            link: '/developer/payslips',
          });
        }
      }
    }
    res.send('OK');
  } catch (err) { next(err); }
};
