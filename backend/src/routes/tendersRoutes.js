const express = require('express');
const TendersController = require('../controllers/tendersController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const auth = new AuthenticateToken();

const tendersRouter = express.Router();
const controller = new TendersController();

tendersRouter.post('/create', auth.authenticateToken, controller.create);
tendersRouter.patch('/update', auth.authenticateToken, controller.update);
tendersRouter.get('/get-tender/:id', auth.authenticateToken, controller.getById);
tendersRouter.delete('/delete-tender/:id', auth.authenticateToken, controller.delete);

module.exports = tendersRouter;