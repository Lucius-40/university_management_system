const express = require('express');
const TeacherController = require('../controllers/teacherController');
const AuthenticateToken = require('../middlewares/authenticateToken');
const {
	validateParamId,
	validateTeacherCreate,
	validateTeacherUpdate,
} = require('../middlewares/requestValidation');

const router = express.Router();
const teacherController = new TeacherController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, validateTeacherCreate, teacherController.createTeacher);
router.post('/batch', auth.authenticateToken, teacherController.createTeachersBatch);
router.get('/', auth.authenticateToken, teacherController.getAllTeachers);
router.get('/search', auth.authenticateToken, teacherController.searchTeachers);
router.get('/me/resource-overview', auth.authenticateToken, teacherController.getMyResourceOverview);
router.get('/pending-registrations', auth.authenticateToken, teacherController.getPendingRegistrations);
router.put('/students/:student_id/approve-all-pending', auth.authenticateToken, validateParamId('student_id'), teacherController.approveAllPendingForStudent);
router.put('/enrollments/:enrollment_id/decision', auth.authenticateToken, validateParamId('enrollment_id'), teacherController.decidePendingEnrollment);
router.get('/:user_id', auth.authenticateToken, validateParamId('user_id'), teacherController.getTeacherByUserId);
router.put('/:user_id', auth.authenticateToken, validateParamId('user_id'), validateTeacherUpdate, teacherController.updateTeacher);
router.delete('/:user_id', auth.authenticateToken, validateParamId('user_id'), teacherController.deleteTeacher);

module.exports = router;
