const express = require('express');
const DepartmentController = require('../controllers/departmentController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const departmentController = new DepartmentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, departmentController.createDepartment);
router.get('/', auth.authenticateToken, departmentController.getAllDepartments);
router.get('/:id', auth.authenticateToken, departmentController.getDepartmentById);
router.put('/:id', auth.authenticateToken, departmentController.updateDepartment);
router.delete('/:id', auth.authenticateToken, departmentController.deleteDepartment);

module.exports = router;
