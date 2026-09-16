const express = require('express');
const router = express.Router();
const materialRequestController = require('../controllers/materialRequestController');
const { protect } = require('../middleware/auth');

router.get('/', protect, materialRequestController.getMaterialRequests);
router.post('/', protect, materialRequestController.createMaterialRequest);
router.patch('/:id/status', protect, materialRequestController.updateRequestStatus);

module.exports = router;
