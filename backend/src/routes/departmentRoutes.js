const express = require('express');
const DepartmentController = require('../controllers/departmentController.js');
const AuthenticateToken = require('../middlewares/authenticateToken.js');

const router = express.Router();
const departmentController = new DepartmentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, departmentController.createDepartment);
router.get('/', auth.authenticateToken, departmentController.getAllDepartments);
router.get('/details/:identifier', auth.authenticateToken, departmentController.getDepartmentFullDetails);
router.get('/:id/heads/current', auth.authenticateToken, departmentController.getCurrentDepartmentHead);
router.get('/:id/heads/history', auth.authenticateToken, departmentController.getDepartmentHeadHistory);
router.get('/:id/heads', auth.authenticateToken, departmentController.getDepartmentHeadTimeline);
router.post('/:id/heads', auth.authenticateToken, departmentController.assignDepartmentHead);
router.patch('/:id/heads/:entryId', auth.authenticateToken, departmentController.updateDepartmentHeadTimelineEntry);
router.get('/:id', auth.authenticateToken, departmentController.getDepartmentById);
router.put('/:id', auth.authenticateToken, departmentController.updateDepartment);
router.delete('/:id', auth.authenticateToken, departmentController.deleteDepartment);

module.exports = router;
