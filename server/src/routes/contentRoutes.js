const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getServices, createService, updateService, deleteService,
  getPortfolioItems, createPortfolioItem, updatePortfolioItem, deletePortfolioItem,
} = require('../controllers/contentController');

router.get('/services', getServices);
router.get('/services/admin', protect, authorize('admin', 'manager'), getServices);
router.post('/services', protect, authorize('admin', 'manager'), createService);
router.put('/services/:id', protect, authorize('admin', 'manager'), updateService);
router.delete('/services/:id', protect, authorize('admin', 'manager'), deleteService);

router.get('/portfolio', getPortfolioItems);
router.get('/portfolio/admin', protect, authorize('admin', 'manager'), getPortfolioItems);
router.post('/portfolio', protect, authorize('admin', 'manager'), createPortfolioItem);
router.put('/portfolio/:id', protect, authorize('admin', 'manager'), updatePortfolioItem);
router.delete('/portfolio/:id', protect, authorize('admin', 'manager'), deletePortfolioItem);

module.exports = router;

