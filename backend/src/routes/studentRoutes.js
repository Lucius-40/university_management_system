const express = require('express');
const StudentController = require('../controllers/studentController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const studentController = new StudentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, studentController.createStudent);
router.get('/', auth.authenticateToken, studentController.getAllStudents);
router.get('/:user_id', auth.authenticateToken, studentController.getStudentByUserId);
router.get('/roll/:roll_number', auth.authenticateToken, studentController.getStudentByRollNumber);
router.put('/:user_id', auth.authenticateToken, studentController.updateStudent);
router.delete('/:user_id', auth.authenticateToken, studentController.deleteStudent);

module.exports = router;
