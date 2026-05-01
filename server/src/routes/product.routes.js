const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadProductImage } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', authorize('admin', 'manager'), uploadProductImage, ctrl.createProduct);
router.put('/:id', authorize('admin', 'manager'), uploadProductImage, ctrl.updateProduct);
router.delete('/:id', authorize('admin'), ctrl.deleteProduct);

module.exports = router;
