const AttendancePolicy = require('../models/AttendancePolicy');

exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await AttendancePolicy.find()
      .populate('branch', 'name')
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, policies });
  } catch (err) { next(err); }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.branch)    payload.branch    = undefined;
    if (!payload.employee)  payload.employee  = undefined;
    if (payload.isDefault && !payload.employee) await AttendancePolicy.updateMany({}, { isDefault: false });
    const policy = await AttendancePolicy.create(payload);
    res.status(201).json({ success: true, policy });
  } catch (err) { next(err); }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.branch)   payload.branch   = undefined;
    if (!payload.employee) payload.employee = undefined;
    if (payload.isDefault && !payload.employee) await AttendancePolicy.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    const policy = await AttendancePolicy.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('branch', 'name')
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, policy });
  } catch (err) { next(err); }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await AttendancePolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, message: 'Attendance policy deleted' });
  } catch (err) { next(err); }
};
