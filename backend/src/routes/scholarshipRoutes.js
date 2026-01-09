const express = require('express')
const ScholarshipController = require('../controllers/scholarshipController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const auth = new AuthenticateToken();

const scholarshipRouter = express.Router();
const controller = new ScholarshipController();

scholarshipRouter.post('/create', auth.authenticateToken, controller.create);
scholarshipRouter.patch('/update', auth.authenticateToken, controller.update);
scholarshipRouter.get('/get-scholarship/:id', auth.authenticateToken, controller.getById);
scholarshipRouter.delete('/delete-scholarship/:id', auth.authenticateToken, controller.delete);

module.exports = scholarshipRouter;
