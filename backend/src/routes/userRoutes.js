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

// Emergency Contact Routes
userRouter.post('/emergency-contact', controller.createEmergencyContact);
userRouter.put('/emergency-contact/:id', controller.updateEmergencyContact);
userRouter.delete('/emergency-contact/:id', controller.deleteEmergencyContact);
userRouter.get('/emergency-contact/:id', controller.getEmergencyContactById);

module.exports = userRouter;
