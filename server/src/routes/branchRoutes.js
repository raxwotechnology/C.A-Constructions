const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getBranches, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');

router.use(protect);
router.get('/', getBranches);
router.post('/', authorize('admin'), createBranch);
router.put('/:id', authorize('admin'), updateBranch);
router.delete('/:id', authorize('admin'), deleteBranch);

module.exports = router;
