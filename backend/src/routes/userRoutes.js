const express = require('express');
const UserController = require('../controllers/userController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const userRouter = express.Router();
const controller = new UserController();
const auth = new AuthenticateToken();

userRouter.post('/register', controller.register);
userRouter.post('/login', controller.login);
userRouter.post('/logout/:userId', controller.logout);
userRouter.get('/verify-token', auth.authenticateToken, controller.verifyToken);

module.exports = userRouter;
