const express = require('express');
const router = express.Router();
const dailyDiaryController = require('../controllers/dailyDiaryController');
const { protect } = require('../middleware/auth');

router.get('/', protect, dailyDiaryController.getDiaries);
router.post('/', protect, dailyDiaryController.createOrUpdateDiary);

module.exports = router;
