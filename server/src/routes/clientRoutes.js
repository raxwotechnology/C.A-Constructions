const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientProfile);
router.put('/:id', clientController.updateClientProfile);
router.post('/:id/notes', clientController.addClientNote);

module.exports = router;
