const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Overtime = require('../models/Overtime');
const SalaryPayment = require('../models/SalaryPayment');
const crypto = require('crypto');
const { createNotification } = require('../services/notificationService');

// EPF/ETF rates (Sri Lanka)
const EPF_EMPLOYEE = 0.08;
const EPF_EMPLOYER = 0.12;
const ETF_EMPLOYER = 0.03;

// @desc    Generate monthly payroll
// @route   POST /api/payroll/generate
exports.generatePayroll = async (req, res, next) => {
  try {
    const { month, year, employeeId, allowances = 0, overtime = 0, commissions = 0, bonus = 0, deductions = 0, loanDeduction = 0, notes } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Check if payroll already exists
    const exists = await Payroll.findOne({ employee: employeeId, month, year });
    if (exists) return res.status(400).json({ success: false, message: 'Payroll already generated for this month' });

    const basicSalary = employee.basicSalary;
    const otRows = await Overtime.find({ employee: employeeId, month, year });
    const overtimeTotal = otRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const finalOvertime = Number(overtime) + overtimeTotal;
    const grossSalary = basicSalary + Number(allowances) + finalOvertime + Number(commissions) + Number(bonus);

    // EPF/ETF calculations
    const epfEmployee = Math.round(basicSalary * EPF_EMPLOYEE);
    const epfEmployer = Math.round(basicSalary * EPF_EMPLOYER);
    const etfEmployer = Math.round(basicSalary * ETF_EMPLOYER);
    const totalDeductions = Number(deductions) + Number(loanDeduction) + epfEmployee;
    const netSalary = grossSalary - totalDeductions;

    const payroll = await Payroll.create({
      employee: employeeId, month, year,
      basicSalary, allowances, overtime: finalOvertime, commissions, bonus, deductions, loanDeduction,
      epfEmployee, epfEmployer, etfEmployer,
      grossSalary, netSalary,
      generatedBy: req.user._id, notes,
    });

    await payroll.populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });

    await createNotification({
      recipient: payroll.employee.userId?._id,
      title: 'Payroll Generated',
      message: `Your payroll for ${month}/${year} has been generated (status: draft). EPF (employee): LKR ${Number(payroll.epfEmployee || 0).toLocaleString()}, EPF (employer): LKR ${Number(payroll.epfEmployer || 0).toLocaleString()}, ETF (employer): LKR ${Number(payroll.etfEmployer || 0).toLocaleString()}.`,
      type: 'payroll',
      link: '/developer/payslips',
    });

    res.status(201).json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Generate payroll for ALL employees
// @route   POST /api/payroll/generate-all
exports.generateAllPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const employees = await Employee.find({ status: 'active' });
    const results = [];
    const errors = [];

    for (const emp of employees) {
      try {
        const exists = await Payroll.findOne({ employee: emp._id, month, year });
        if (exists) { errors.push({ employeeId: emp._id, message: 'Already exists' }); continue; }

        const basicSalary = emp.basicSalary;
        const allowances = emp.allowances || 0;
        const otRows = await Overtime.find({ employee: emp._id, month, year });
        const overtime = otRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const grossSalary = basicSalary + allowances + overtime;
        const epfEmployee = Math.round(basicSalary * EPF_EMPLOYEE);
        const epfEmployer = Math.round(basicSalary * EPF_EMPLOYER);
        const etfEmployer = Math.round(basicSalary * ETF_EMPLOYER);
        const netSalary = grossSalary - epfEmployee;

        const payroll = await Payroll.create({
          employee: emp._id, month, year,
          basicSalary, allowances, overtime, grossSalary, netSalary,
          epfEmployee, epfEmployer, etfEmployer,
          generatedBy: req.user._id,
        });
        results.push(payroll);
      } catch (e) {
        errors.push({ employeeId: emp._id, message: e.message });
      }
    }
    res.status(201).json({ success: true, generated: results.length, errors, results });
  } catch (err) { next(err); }
};

// @desc    Get payroll list
// @route   GET /api/payroll
exports.getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employee, status } = req.query;
    let query = {};
    if (month) query.month = month;
    if (year) query.year = year;
    if (employee) query.employee = employee;
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
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
    const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 });
    res.json({ success: true, payrolls });
  } catch (err) { next(err); }
};

// @desc    Approve payroll
// @route   PUT /api/payroll/:id/approve
exports.approvePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });
    res.json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/pay
exports.markPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date() }, { new: true })
      .populate({ path: 'employee', populate: { path: 'userId', select: '_id name email' } });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });

    await createNotification({
      recipient: payroll.employee?.userId?._id,
      title: 'Salary Credited',
      message: `Salary credited for ${payroll.month}/${payroll.year}. Net: LKR ${Number(payroll.netSalary || 0).toLocaleString()}`,
      type: 'payroll',
      link: '/developer/payslips',
    });

    res.json({ success: true, payroll });
  } catch (err) { next(err); }
};

// @desc    Get EPF/ETF summary
// @route   GET /api/payroll/epf-summary
exports.getEpfSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const payrolls = await Payroll.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });

    const summary = payrolls.map(p => ({
      employeeNo: p.employee?.employeeNo,
      name: p.employee?.userId?.name,
      epfNo: p.employee?.epfNumber,
      basicSalary: p.basicSalary,
      epfEmployee: p.epfEmployee,
      epfEmployer: p.epfEmployer,
      totalEPF: p.epfEmployee + p.epfEmployer,
      etfEmployer: p.etfEmployer,
      month: p.month,
      year: p.year,
    }));

    const totals = {
      epfEmployee: summary.reduce((a, b) => a + b.epfEmployee, 0),
      epfEmployer: summary.reduce((a, b) => a + b.epfEmployer, 0),
      totalEPF: summary.reduce((a, b) => a + b.totalEPF, 0),
      etfEmployer: summary.reduce((a, b) => a + b.etfEmployer, 0),
    };

    res.json({ success: true, summary, totals });
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
