const express = require('express');
const router = express.Router();
const boqController = require('../controllers/boqController');
const { protect } = require('../middleware/auth');

router.get('/', protect, boqController.getBOQ);
router.post('/items', protect, boqController.addBOQItem);
router.put('/items/:codeOrId', protect, boqController.updateBOQItem);
router.delete('/items/:codeOrId', protect, boqController.deleteBOQItem);

module.exports = router;
