const DeletionRequest = require('../models/DeletionRequest');
const { verifyActionPassword } = require('../utils/actionPassword');
const AuditLog = require('../models/AuditLog');

// Create a Delete Request (Manager/Supervisor/Staff -> Admin)
exports.createDeleteRequest = async (req, res) => {
  try {
    const { module, entityId, entityName, reason } = req.body;

    if (!module || !entityId) {
      return res.status(400).json({ success: false, message: 'Module and entity ID are required.' });
    }

    const request = await DeletionRequest.create({
      requestedBy: req.user._id,
      requestedByName: req.user.name,
      userRole: req.user.role,
      module: module || 'General',
      entityId: String(entityId),
      entityName: entityName || 'Record',
      reason: reason || 'Deletion requested for Admin approval.',
    });

    try {
      await AuditLog.create({
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DELETE_REQUESTED',
        module: module || 'General',
        entityId: String(entityId),
        entityName: entityName || 'Record',
        description: `Delete request submitted to Admin for ${entityName} (${module}). Reason: ${reason || 'N/A'}`,
      });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Delete request sent to Admin successfully! The record will be deleted once approved.',
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Delete Requests (Admin View)
exports.getDeleteRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await DeletionRequest.find(filter)
      .populate('requestedBy', 'name role email phone')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin approves & executes deletion
exports.approveDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const request = await DeletionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Delete request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    request.status = 'approved';
    request.adminNote = adminNote || 'Approved by Admin';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: `Delete request for "${request.entityName}" approved and marked for removal.`,
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin rejects deletion request
exports.rejectDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const request = await DeletionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Delete request not found.' });
    }

    request.status = 'rejected';
    request.adminNote = adminNote || 'Rejected by Admin';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: `Delete request for "${request.entityName}" rejected by Admin.`,
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Direct Admin Password Verification Endpoint
exports.verifyAdminPasswordForDelete = async (req, res) => {
  try {
    const { password } = req.body;
    const check = await verifyActionPassword(req.user._id, password, true);

    if (!check.ok) {
      return res.status(check.status || 401).json({ success: false, message: check.message });
    }

    res.json({
      success: true,
      message: 'Admin Password verified successfully! Deletion authorized.',
      verifiedBy: check.verifiedUser?.name || req.user.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
