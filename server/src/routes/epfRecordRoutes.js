const express = require('express');
const router  = express.Router();
const {
  getEpfRecords,
  updateEpfRecord,
  togglePaid,
  deleteEpfRecord,
} = require('../controllers/epfRecordController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',           protect, authorize('admin', 'manager'), getEpfRecords);
router.put('/:id/pay',    protect, authorize('admin'),            togglePaid);
router.put('/:id',        protect, authorize('admin', 'manager'), updateEpfRecord);
router.delete('/:id',     protect, authorize('admin'),            deleteEpfRecord);

module.exports = router;
