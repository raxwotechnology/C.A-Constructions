const express = require('express');
const router = express.Router();
const { getLeaders, createLeader, updateLeader, deleteLeader } = require('../controllers/leaderController');
const { protect, authorize } = require('../middleware/auth');
const { uploadLeaderPhoto } = require('../middleware/upload');

router.get('/', getLeaders);

// Admin only routes
router.use(protect, authorize('admin'));
router.post('/',     uploadLeaderPhoto, createLeader);
router.put('/:id',  uploadLeaderPhoto, updateLeader);
router.delete('/:id', deleteLeader);

module.exports = router;
