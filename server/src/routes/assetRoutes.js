const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, assetController.getAssetSummary);
router.get('/', protect, assetController.getAssets);
router.post('/', protect, assetController.createAsset);
router.get('/:id', protect, assetController.getAssetById);
router.put('/:id', protect, assetController.updateAsset);
router.delete('/:id', protect, assetController.deleteAsset);

module.exports = router;
