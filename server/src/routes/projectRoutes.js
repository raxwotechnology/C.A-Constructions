const express = require('express');
const router = express.Router();
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addTask, updateTask, getStats,
  addNote, updateNote, deleteNote, addLink, removeLink, uploadDocument, removeDocument,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { uploadFile: uploadProjectFileMw } = require('../middleware/upload');

router.get('/stats', protect, authorize('admin', 'manager'), getStats);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProject);
router.post('/', protect, authorize('admin', 'manager'), createProject);
router.put('/:id', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), updateProject);
router.delete('/:id', protect, authorize('admin'), deleteProject);

// Tasks
router.post('/:id/tasks', protect, addTask);
router.put('/:id/tasks/:taskId', protect, updateTask);

// Notes
router.post('/:id/notes', protect, addNote);
router.put('/:id/notes/:noteId', protect, authorize('admin', 'manager'), updateNote);
router.delete('/:id/notes/:noteId', protect, authorize('admin', 'manager'), deleteNote);

// Links (same roles as project updates so team members are not blocked)
router.post('/:id/links', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), addLink);
router.delete('/:id/links/:linkId', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), removeLink);

// Documents
router.post('/:id/documents', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), uploadProjectFileMw, uploadDocument);
router.delete('/:id/documents/:docId', protect, authorize('admin', 'manager', 'developer', 'designer', 'marketing'), removeDocument);

module.exports = router;
