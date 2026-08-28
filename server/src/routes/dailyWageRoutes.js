const express = require('express');
const router = express.Router();
const dailyWageController = require('../controllers/dailyWageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .post(dailyWageController.createDailyWageLog)
  .get(dailyWageController.getDailyWageLogs);

router.post('/calculate-preview', dailyWageController.calculatePayPreview);
router.get('/project-summary/:projectId', dailyWageController.getProjectSqftSummary);

router
  .route('/:id')
  .get(dailyWageController.getDailyWageLogById)
  .put(dailyWageController.updateDailyWageLog)
  .delete(dailyWageController.deleteDailyWageLog);

module.exports = router;
