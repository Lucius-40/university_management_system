const express = require('express');
const TermController = require('../controllers/termController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const termController = new TermController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, termController.createTerm);
router.get('/', auth.authenticateToken, termController.getAllTerms);
router.get('/:id', auth.authenticateToken, termController.getTermById);
router.put('/:id', auth.authenticateToken, termController.updateTerm);
router.delete('/:id', auth.authenticateToken, termController.deleteTerm);

module.exports = router;
