const express = require('express')
const BankAccountController = require('../controllers/bankAccountController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const auth = new AuthenticateToken();

const bankAccountRouter = express.Router();
const controller = new BankAccountController();

bankAccountRouter.post('/create-account',auth.authenticateToken, controller.create);
bankAccountRouter.patch('/update-account',auth.authenticateToken ,controller.update );
bankAccountRouter.get('/get-account/:id', auth.authenticateToken,controller.getById);
bankAccountRouter.delete('/delete-account/:id',auth.authenticateToken ,controller.delete);

module.exports = bankAccountRouter ;



