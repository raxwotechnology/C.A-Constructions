const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createDeleteRequest,
  getDeleteRequests,
  approveDeleteRequest,
  rejectDeleteRequest,
  verifyAdminPasswordForDelete,
} = require('../controllers/deletionRequestController');

router.use(protect);

router.post('/request', createDeleteRequest);
router.get('/', getDeleteRequests);
router.put('/:id/approve', approveDeleteRequest);
router.put('/:id/reject', rejectDeleteRequest);
router.post('/verify-password', verifyAdminPasswordForDelete);

module.exports = router;
