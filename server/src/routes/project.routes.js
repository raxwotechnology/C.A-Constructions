const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/project.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getProjects);
router.get('/:id', ctrl.getProject);
router.post('/', authorize('admin', 'manager'), ctrl.createProject);
router.put('/:id', authorize('admin', 'manager'), ctrl.updateProject);
router.delete('/:id', authorize('admin'), ctrl.deleteProject);
router.post('/:id/milestones', ctrl.addMilestone);
router.put('/:id/milestones/:milestoneId', ctrl.updateMilestone);
router.post('/:id/progress', ctrl.addProgressLog);

module.exports = router;
