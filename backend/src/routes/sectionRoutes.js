const express = require('express');
const SectionController = require('../controllers/sectionController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const sectionController = new SectionController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, sectionController.createSection);
router.get('/', auth.authenticateToken, sectionController.getAllSections);
router.get('/term/:term_id', auth.authenticateToken, sectionController.getSectionsByTermId);
router.delete('/', auth.authenticateToken, sectionController.deleteSection);

module.exports = router;
