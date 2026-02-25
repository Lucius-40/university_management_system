const express = require('express');
const FeedbackController = require('../controllers/feedbackController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const feedbackController = new FeedbackController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, feedbackController.createFeedback);
router.get('/', auth.authenticateToken, feedbackController.getAllFeedback);
router.get('/:id', auth.authenticateToken, feedbackController.getFeedbackById);
router.put('/:id', auth.authenticateToken, feedbackController.updateFeedback);
router.delete('/:id', auth.authenticateToken, feedbackController.deleteFeedback);

module.exports = router;
