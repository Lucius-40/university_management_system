const express = require('express')
const BankAccountController = require('../controllers/bankAccountController.js');

const bankAccountRouter = express.Router();
const controller = new BankAccountController();

bankAccountRouter.post('/create-account', controller.create);
bankAccountRouter.post('/update-account', controller.update );
bankAccountRouter.get('/get-account/:id', controller.getById);
bankAccountRouter.delete('/delete-account/:id', controller.delete);

module.exports = bankAccountRouter ;



