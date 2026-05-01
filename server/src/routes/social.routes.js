const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/social.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadSocialMedia } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/', ctrl.getPosts);
router.post('/', uploadSocialMedia, ctrl.createPost);
router.put('/:id', uploadSocialMedia, ctrl.updatePost);
router.delete('/:id', ctrl.deletePost);
router.patch('/:id/publish', ctrl.publishPost);

module.exports = router;
