const express = require('express');
const MarkingController = require('../controllers/markingController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const markingController = new MarkingController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, markingController.createMarkingComponent);
router.get('/', auth.authenticateToken, markingController.getAllMarkingComponents);
router.get('/:id', auth.authenticateToken, markingController.getMarkingComponentById);
router.put('/:id', auth.authenticateToken, markingController.updateMarkingComponent);
router.delete('/:id', auth.authenticateToken, markingController.deleteMarkingComponent);

module.exports = router;
