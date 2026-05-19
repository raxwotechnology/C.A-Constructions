const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const requestController = require('../controllers/requestController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUploadsRoot } = require('../utils/uploadsPath');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsRoot(), 'requests');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `req-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

// Employee routes
router.post('/', authorize('developer', 'designer', 'marketing', 'manager'), upload.array('attachments', 5), requestController.submitRequest);
router.get('/my', authorize('developer', 'designer', 'marketing', 'manager'), requestController.getMyRequests);
router.get('/:id', authorize('developer', 'designer', 'marketing', 'manager', 'admin'), requestController.getRequest);

// Admin/Manager routes
router.get('/', authorize('admin', 'manager'), requestController.getAllRequests);
router.put('/:id/approve', authorize('admin', 'manager'), requestController.approveRequest);
router.put('/:id/reject', authorize('admin', 'manager'), requestController.rejectRequest);

module.exports = router;
