const express = require('express');
const DepartmentController = require('../controllers/departmentController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const auth = new AuthenticateToken();

const departmentRouter = express.Router();
const controller = new DepartmentController();

departmentRouter.post('/create', auth.authenticateToken, controller.create);
departmentRouter.patch('/update', auth.authenticateToken, controller.update);
departmentRouter.get('/get-department/:id', auth.authenticateToken, controller.getById);
departmentRouter.delete('/delete-department/:id', auth.authenticateToken, controller.delete);

module.exports = departmentRouter;