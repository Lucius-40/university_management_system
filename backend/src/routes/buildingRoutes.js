const express = require('express')
const BuildingController = require('../controllers/buildingController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const auth = new AuthenticateToken();

const buildingRouter = express.Router();
const controller = new BuildingController();

buildingRouter.post('/create',auth.authenticateToken, controller.create);
buildingRouter.patch('/update',auth.authenticateToken ,controller.update );
buildingRouter.get('/get-building/:id', auth.authenticateToken,controller.getById);
buildingRouter.delete('/delete-building/:id',auth.authenticateToken ,controller.delete);

module.exports = buildingRouter ;