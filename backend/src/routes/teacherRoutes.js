const express = require('express');
const TeacherController = require('../controllers/teacherController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const teacherController = new TeacherController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, teacherController.createTeacher);
router.post('/batch', auth.authenticateToken, teacherController.createTeachersBatch);
router.get('/', auth.authenticateToken, teacherController.getAllTeachers);
router.get('/pending-registrations', auth.authenticateToken, teacherController.getPendingRegistrations);
router.put('/students/:student_id/approve-all-pending', auth.authenticateToken, teacherController.approveAllPendingForStudent);
router.put('/enrollments/:enrollment_id/decision', auth.authenticateToken, teacherController.decidePendingEnrollment);
router.get('/:user_id', auth.authenticateToken, teacherController.getTeacherByUserId);
router.put('/:user_id', auth.authenticateToken, teacherController.updateTeacher);
router.delete('/:user_id', auth.authenticateToken, teacherController.deleteTeacher);

module.exports = router;
