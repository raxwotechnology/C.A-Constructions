const express = require('express');
const router = express.Router();
const { getProjects, getProject, createProject, updateProject, deleteProject, addTask, updateTask, getStats } = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('admin', 'manager'), getStats);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProject);
router.post('/', protect, authorize('admin', 'manager'), createProject);
router.put('/:id', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), updateProject);
router.delete('/:id', protect, authorize('admin'), deleteProject);
router.post('/:id/tasks', protect, addTask);
router.put('/:id/tasks/:taskId', protect, updateTask);

module.exports = router;
