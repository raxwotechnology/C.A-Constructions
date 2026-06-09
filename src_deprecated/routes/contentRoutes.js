const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getServices, createService, updateService, deleteService,
  getPortfolioItems, createPortfolioItem, updatePortfolioItem, deletePortfolioItem,
} = require('../controllers/contentController');

router.get('/services', getServices);
router.post('/services', protect, authorize('admin'), createService);
router.put('/services/:id', protect, authorize('admin'), updateService);
router.delete('/services/:id', protect, authorize('admin'), deleteService);

router.get('/portfolio', getPortfolioItems);
router.post('/portfolio', protect, authorize('admin'), createPortfolioItem);
router.put('/portfolio/:id', protect, authorize('admin'), updatePortfolioItem);
router.delete('/portfolio/:id', protect, authorize('admin'), deletePortfolioItem);

module.exports = router;

