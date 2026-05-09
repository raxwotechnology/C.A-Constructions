const BonusTarget = require('../models/BonusTarget');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const { createNotification } = require('../services/notificationService');

exports.createTarget = async (req, res, next) => {
  try {
    const { employeeId, targetName, metricDescription, targetValue, measurementPeriod, deadline } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const target = await BonusTarget.create({
      employee: employeeId,
      branch: employee.branch,
      targetName,
      metricDescription,
      targetValue,
      measurementPeriod,
      deadline: new Date(deadline),
      createdBy: req.user._id
    });

    await createNotification({
      recipient: employee.userId,
      title: 'New Bonus Target Assigned',
      message: `A new bonus target "${targetName}" has been assigned to you. Deadline: ${new Date(deadline).toLocaleDateString()}`,
      type: 'system',
      link: '/developer/tasks'
    });

    res.status(201).json({ success: true, target });
  } catch (err) { next(err); }
};

exports.getTargets = async (req, res, next) => {
  try {
    const { branch, status, employeeId } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;

    const targets = await BonusTarget.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ deadline: 1 });

    res.json({ success: true, count: targets.length, targets });
  } catch (err) { next(err); }
};

exports.markAchieved = async (req, res, next) => {
  try {
    const { bonusAmount, payrollId } = req.body; // Can link to an existing draft payroll, or just wait for next generation
    const target = await BonusTarget.findById(req.params.id).populate({ path: 'employee', populate: { path: 'userId' } });
    if (!target) return res.status(404).json({ success: false, message: 'Target not found' });

    target.status = 'achieved';
    target.achievedAt = new Date();
    target.bonusAmount = Number(bonusAmount || 0);
    if (payrollId) target.linkedPayroll = payrollId;
    await target.save();

    // If a payrollId was passed, we add the bonus to that draft payroll
    if (payrollId) {
      const payroll = await Payroll.findById(payrollId);
      if (payroll && payroll.status === 'draft') {
        payroll.bonus = (payroll.bonus || 0) + target.bonusAmount;
        payroll.grossSalary += target.bonusAmount;
        payroll.netSalary += target.bonusAmount;
        await payroll.save();
      }
    }

    await createNotification({
      recipient: target.employee.userId._id,
      title: 'Bonus Target Achieved! 🎉',
      message: `Congratulations! You achieved the target "${target.targetName}" and earned a bonus of LKR ${target.bonusAmount.toLocaleString()}.`,
      type: 'payroll',
      link: '/developer/payslips'
    });

    res.json({ success: true, target });
  } catch (err) { next(err); }
};
