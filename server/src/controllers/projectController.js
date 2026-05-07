const Project = require('../models/Project');
const { createNotification } = require('../services/notificationService');

// @desc    Get all projects
// @route   GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    const { status, client } = req.query;
    let query = {};
    if (status) query.status = status;

    // Clients only see their projects
    if (req.user.role === 'client') query.client = req.user._id;
    else if (client) query.client = client;

    // Developers see assigned projects
    if (['developer', 'designer', 'marketing'].includes(req.user.role)) query.assignedEmployees = req.user._id;

    const projects = await Project.find(query)
      .populate('client', 'name email avatar')
      .populate('projectManager', 'name email avatar')
      .populate('assignedEmployees', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, projects });
  } catch (err) { next(err); }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email avatar')
      .populate('projectManager', 'name email avatar')
      .populate('assignedEmployees', 'name email avatar')
      .populate('tasks.assignedTo', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.client) delete payload.client;
    if (!payload.projectManager) delete payload.projectManager;
    if (!Array.isArray(payload.assignedEmployees)) payload.assignedEmployees = [];
    payload.assignedEmployees = payload.assignedEmployees.filter(Boolean);

    const project = await Project.create(payload);

    if (project.client) {
      await createNotification({
        recipient: project.client,
        title: 'New Project Created',
        message: `Your project "${project.title}" has been created and is in ${project.status} stage.`,
        type: 'project',
        link: '/my-projects',
      });
    }
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.client === '') delete payload.client;
    if (payload.projectManager === '') delete payload.projectManager;
    if (Array.isArray(payload.assignedEmployees)) payload.assignedEmployees = payload.assignedEmployees.filter(Boolean);

    const project = await Project.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Notify client + assigned developers on updates
    if (project.client) {
      await createNotification({
        recipient: project.client,
        title: 'Project Updated',
        message: `Project "${project.title}" has been updated.`,
        type: 'project',
        link: '/my-projects',
      });
    }
    await Promise.all((project.assignedEmployees || []).map((u) => createNotification({
      recipient: u,
      title: 'Project Updated',
      message: `Project "${project.title}" has been updated.`,
      type: 'project',
      link: '/developer/projects',
    })));

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

// @desc    Add task to project
// @route   POST /api/projects/:id/tasks
exports.addTask = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    project.tasks.push(req.body);
    await project.save();
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
};

// @desc    Update task status
// @route   PUT /api/projects/:id/tasks/:taskId
exports.updateTask = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    Object.assign(task, req.body);
    if (req.body.status === 'done') task.completedAt = new Date();
    await project.save();

    if (task.assignedTo) {
      await createNotification({
        recipient: task.assignedTo,
        title: 'Task Updated',
        message: `Task "${task.title}" status: ${task.status}`,
        type: 'project',
        link: '/developer/tasks',
      });
    }

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// @desc    Get dashboard stats
// @route   GET /api/projects/stats
exports.getStats = async (req, res, next) => {
  try {
    const total = await Project.countDocuments();
    const active = await Project.countDocuments({ status: 'active' });
    const completed = await Project.countDocuments({ status: 'completed' });
    const byStatus = await Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ success: true, stats: { total, active, completed, byStatus } });
  } catch (err) { next(err); }
};
