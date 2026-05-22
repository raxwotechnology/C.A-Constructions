const SocialAssignment = require('../models/SocialAssignment');
const Employee = require('../models/Employee');

// GET all assignments (admin/manager)
exports.getAssignments = async (req, res, next) => {
  try {
    const assignments = await SocialAssignment.find()
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('assignedBy', 'name')
      .sort({ platform: 1, createdAt: -1 });
    res.json({ success: true, assignments });
  } catch (err) { next(err); }
};

// POST assign employee to platform
exports.createAssignment = async (req, res, next) => {
  try {
    const { platform, employeeId, note } = req.body;
    if (!platform || !employeeId) {
      return res.status(400).json({ success: false, message: 'platform and employeeId are required' });
    }
    // Upsert: if same employee+platform exists update note, else create
    const assignment = await SocialAssignment.findOneAndUpdate(
      { platform, employee: employeeId },
      { platform, employee: employeeId, assignedBy: req.user._id, note: note || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const populated = await assignment.populate([
      { path: 'employee', populate: { path: 'userId', select: 'name email' } },
      { path: 'assignedBy', select: 'name' }
    ]);
    res.status(201).json({ success: true, assignment: populated });
  } catch (err) { next(err); }
};

// DELETE remove assignment
exports.deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await SocialAssignment.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET platforms assigned to the currently logged-in employee
exports.getMyAssignedPlatforms = async (req, res, next) => {
  try {
    // Find the employee record for this user
    const employee = await Employee.findOne({ userId: req.user._id }).lean();
    if (!employee) return res.json({ success: true, platforms: [] });

    const assignments = await SocialAssignment.find({ employee: employee._id })
      .select('platform note createdAt')
      .lean();

    res.json({ success: true, platforms: assignments.map(a => a.platform) });
  } catch (err) { next(err); }
};
