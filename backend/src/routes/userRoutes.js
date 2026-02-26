const express = require('express');
const UserController = require('../controllers/userController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const userController = new UserController();
const auth = new AuthenticateToken();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', auth.authenticateToken, userController.logoutUser);
router.get('/profile', auth.authenticateToken, userController.getUserProfile);

module.exports = router;
