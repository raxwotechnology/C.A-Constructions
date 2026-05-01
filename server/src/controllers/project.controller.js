const Project = require('../models/Project.model');
const axios = require('axios');

// @desc    Get all projects
// @route   GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const { status, priority, type, assignedTo, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.projectType = type;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } }
    ];

    // If not admin, only show assigned projects
    if (req.user.userType !== 'admin') {
      filter.assignedTo = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .populate('assignedTo', 'fullName photo employeeId userType')
      .populate('createdBy', 'fullName')
      .skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    res.json({
      success: true, data: projects,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedTo', 'fullName photo employeeId userType email phone')
      .populate('createdBy', 'fullName')
      .populate('milestones.loggedBy', 'fullName')
      .populate('progressLogs.loggedBy', 'fullName');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project updated', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add milestone to project
// @route   POST /api/projects/:id/milestones
exports.addMilestone = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    project.milestones.push(req.body);
    await project.save();
    res.status(201).json({ success: true, message: 'Milestone added', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update milestone
// @route   PUT /api/projects/:id/milestones/:milestoneId
exports.updateMilestone = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    Object.assign(milestone, req.body);
    await project.save();
    res.json({ success: true, message: 'Milestone updated', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add progress log
// @route   POST /api/projects/:id/progress
exports.addProgressLog = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.progressLogs.push({ ...req.body, loggedBy: req.user._id });
    project.progressPercentage = req.body.progressPercentage;
    await project.save();

    // Get AI prediction after progress update
    try {
      const aiResponse = await axios.post(`${process.env.PYTHON_SERVICE_URL}/api/predict-project`, {
        project: {
          progress_percentage: project.progressPercentage,
          project_type: project.projectType,
          priority: project.priority,
          start_date: project.startDate
        },
        milestones: project.milestones,
        progress_logs: project.progressLogs
      }, { timeout: 5000 });

      if (aiResponse.data.predicted_completion_date) {
        project.aiPredictedEndDate = aiResponse.data.predicted_completion_date;
        project.aiConfidenceScore = aiResponse.data.confidence_score;
        await project.save();
      }
    } catch (aiErr) {
      console.warn('AI prediction unavailable:', aiErr.message);
    }

    res.status(201).json({ success: true, message: 'Progress logged', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get project stats
// @route   GET /api/projects/stats
exports.getStats = async (req, res) => {
  try {
    const stats = await Project.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progressPercentage' }
      }},
    ]);

    const total = await Project.countDocuments();
    const overdue = await Project.countDocuments({
      expectedEndDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    });

    res.json({ success: true, data: { byStatus: stats, total, overdue } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
