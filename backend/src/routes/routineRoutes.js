const express = require('express');
const RoutineController = require('../controllers/routineController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const routineController = new RoutineController();
const auth = new AuthenticateToken();

router.get('/current', routineController.getCurrentRoutine);
router.post(
    '/current',
    auth.authenticateToken,
    routineController.uploadMiddleware,
    routineController.uploadRoutine
);

module.exports = router;
