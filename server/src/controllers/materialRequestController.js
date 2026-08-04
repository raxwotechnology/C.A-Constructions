const MaterialRequest = require('../models/MaterialRequest');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Submit Material Request (by Supervisor)
exports.createMaterialRequest = async (req, res) => {
  try {
    const { projectId, items, urgency, notes } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project/Site not found' });

    const requestNo = 'MR-' + Date.now().toString().slice(-6);

    const matReq = await MaterialRequest.create({
      requestNo,
      project: projectId,
      siteName: project.name || project.title,
      supervisor: req.user._id,
      supervisorName: req.user.name,
      items: Array.isArray(items) ? items : [],
      urgency: urgency || 'Medium',
      status: 'pending',
      notes: notes || '',
    });

    // Send Notification to Admins
    try {
      const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] } });
      for (const admin of adminUsers) {
        await Notification.create({
          recipient: admin._id,
          title: `New Material Request (${requestNo})`,
          message: `Supervisor ${req.user.name} submitted a ${urgency || 'Medium'} priority material request for site "${project.name || project.title}".`,
          type: 'inventory_alert',
          link: '/admin/site-management',
        });
      }
    } catch (notifErr) {
      console.warn('[MaterialRequest] Notification create warning:', notifErr.message);
    }

    res.json({ success: true, message: 'Material Request submitted to Admin successfully', materialRequest: matReq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Material Requests (with optional project filter)
exports.getMaterialRequests = async (req, res) => {
  try {
    const { projectId, status } = req.query;
    const filter = {};
    if (projectId) filter.project = projectId;
    if (status) filter.status = status;

    const requests = await MaterialRequest.find(filter)
      .populate('project', 'name title location')
      .populate('supervisor', 'name phone email')
      .populate('actionBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Request Status (Approve / Reject / Fulfill by Admin)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const matReq = await MaterialRequest.findById(id).populate('project');
    if (!matReq) return res.status(404).json({ success: false, message: 'Material Request not found' });

    matReq.status = status;
    if (adminNotes) matReq.adminNotes = adminNotes;
    matReq.actionBy = req.user._id;
    matReq.actionAt = new Date();
    await matReq.save();

    // Notify Supervisor
    try {
      await Notification.create({
        recipient: matReq.supervisor,
        title: `Material Request ${matReq.requestNo} ${status.toUpperCase()}`,
        message: `Your material request for ${matReq.siteName} has been marked as ${status.toUpperCase()} by Admin.`,
        type: 'inventory_alert',
        link: '/supervisor',
      });
    } catch (notifErr) {
      console.warn('[MaterialRequest] Supervisor notification warning:', notifErr.message);
    }

    res.json({ success: true, message: `Material Request updated to ${status}`, materialRequest: matReq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
