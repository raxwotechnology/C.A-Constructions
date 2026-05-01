const { Salary, Payroll, Overtime } = require('../models/Salary.model');
const User = require('../models/User.model');

// ---- SALARY STRUCTURE ----
exports.getSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find({ isActive: true }).populate('employee', 'fullName employeeId userType');
    res.json({ success: true, data: salaries });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.setSalary = async (req, res) => {
  try {
    await Salary.updateMany({ employee: req.body.employee, isActive: true }, { isActive: false });
    const salary = await Salary.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Salary structure saved', data: salary });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ---- PAYROLL ----
exports.getPayroll = async (req, res) => {
  try {
    const { month, year, employeeId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (req.user.userType !== 'admin') filter.employee = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payroll.countDocuments(filter);
    const records = await Payroll.find(filter).populate('employee', 'fullName employeeId userType').skip(skip).limit(parseInt(limit)).sort({ year: -1, month: -1 });
    res.json({ success: true, data: records, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.processPayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;
    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const salary = await Salary.findOne({ employee: employeeId, isActive: true });
    const basicSalary = salary ? salary.basicSalary : (employee.salary || 0);

    let allowances = 0, deductions = 0;
    if (salary) {
      salary.components.forEach(c => {
        const amt = c.isPercentage ? (basicSalary * c.amount / 100) : c.amount;
        if (c.type === 'allowance') allowances += amt;
        else deductions += amt;
      });
    }

    const grossSalary = basicSalary + allowances;
    const netSalary = grossSalary - deductions;

    const existing = await Payroll.findOne({ employee: employeeId, month, year });
    if (existing) return res.status(400).json({ success: false, message: 'Payroll already processed for this period' });

    const payroll = await Payroll.create({ employee: employeeId, month, year, basicSalary, allowances, deductions, grossSalary, netSalary, status: 'processed', processedBy: req.user._id });
    res.status(201).json({ success: true, message: 'Payroll processed', data: payroll });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.markPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date(), paymentMethod: req.body.paymentMethod }, { new: true });
    res.json({ success: true, message: 'Marked as paid', data: payroll });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ---- OVERTIME ----
exports.getOvertime = async (req, res) => {
  try {
    const filter = req.user.userType !== 'admin' ? { employee: req.user._id } : {};
    const records = await Overtime.find(filter).populate('employee', 'fullName employeeId').sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.addOvertime = async (req, res) => {
  try {
    const record = await Overtime.create({ ...req.body, employee: req.body.employee || req.user._id });
    res.status(201).json({ success: true, message: 'Overtime recorded', data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.approveOvertime = async (req, res) => {
  try {
    const record = await Overtime.findByIdAndUpdate(req.params.id, { status: req.body.status, approvedBy: req.user._id, approvedAt: new Date(), remarks: req.body.remarks }, { new: true });
    res.json({ success: true, message: `Overtime ${req.body.status}`, data: record });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
