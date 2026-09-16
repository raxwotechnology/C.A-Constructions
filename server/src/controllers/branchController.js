const Branch = require('../models/Branch');
const { createAuditLog } = require('./auditController');
const { verifyActionPassword } = require('../utils/actionPassword');

// @desc    Get all branches
// @route   GET /api/branches
exports.getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find()
      .populate('manager', 'name email')
      .sort({ isHeadOffice: -1, name: 1 });
    res.json({ success: true, count: branches.length, branches });
  } catch (err) { next(err); }
};

// @desc    Create branch
// @route   POST /api/branches
exports.createBranch = async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    await createAuditLog({ user: req.user, action: 'create', module: 'branches', entityId: branch._id, entityName: branch.name, description: `Branch "${branch.name}" created` });
    res.status(201).json({ success: true, branch });
  } catch (err) { next(err); }
};

// @desc    Update branch
// @route   PUT /api/branches/:id
exports.updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    await createAuditLog({ user: req.user, action: 'update', module: 'branches', entityId: branch._id, entityName: branch.name, description: `Branch "${branch.name}" updated` });
    res.json({ success: true, branch });
  } catch (err) { next(err); }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
exports.deleteBranch = async (req, res, next) => {
  try {
    // Enforce admin password verification before deletion
    const verify = await verifyActionPassword(req.user._id, req.body.password);
    if (!verify.ok) {
      return res.status(verify.status).json({ success: false, message: verify.message });
    }

    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    await createAuditLog({ user: req.user, action: 'delete', module: 'branches', entityId: branch._id, entityName: branch.name, description: `Branch "${branch.name}" deleted`, severity: 'warning' });
    res.json({ success: true, message: 'Branch deleted' });
  } catch (err) { next(err); }
};
