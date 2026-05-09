const express = require('express');
const router = express.Router();
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addTask, updateTask, getStats,
  addNote, addLink, removeLink, uploadDocument, removeDocument,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { uploadDocument: uploadDocMw } = require('../middleware/upload');

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

// Links
router.post('/:id/links', protect, authorize('admin', 'manager'), addLink);
router.delete('/:id/links/:linkId', protect, authorize('admin', 'manager'), removeLink);

// Documents
router.post('/:id/documents', protect, authorize('admin', 'manager'), uploadDocMw, uploadDocument);
router.delete('/:id/documents/:docId', protect, authorize('admin', 'manager'), removeDocument);

module.exports = router;
