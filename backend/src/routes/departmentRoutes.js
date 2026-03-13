const express = require('express');
const DepartmentController = require('../controllers/departmentController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const router = express.Router();
const departmentController = new DepartmentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, departmentController.createDepartment);
router.get('/', auth.authenticateToken, departmentController.getAllDepartments);
router.get('/details/:identifier', auth.authenticateToken, departmentController.getDepartmentFullDetails);
router.get('/:id', auth.authenticateToken, departmentController.getDepartmentById);
router.put('/:id', auth.authenticateToken, departmentController.updateDepartment);
router.delete('/:id', auth.authenticateToken, departmentController.deleteDepartment);

module.exports = router;
