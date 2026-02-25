const express = require('express');
const TeacherController = require('../controllers/teacherController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const teacherController = new TeacherController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, teacherController.createTeacher);
router.get('/', auth.authenticateToken, teacherController.getAllTeachers);
router.get('/:user_id', auth.authenticateToken, teacherController.getTeacherByUserId);
router.put('/:user_id', auth.authenticateToken, teacherController.updateTeacher);
router.delete('/:user_id', auth.authenticateToken, teacherController.deleteTeacher);

module.exports = router;
