const express = require('express');
const StudentController = require('../controllers/studentController');
const AuthenticateToken = require('../middlewares/authenticateToken');
const {
	validateParamId,
	validateStudentCreate,
	validateStudentUpdate,
} = require('../middlewares/requestValidation');

const router = express.Router();
const studentController = new StudentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, validateStudentCreate, studentController.createStudent);
router.post('/batch', auth.authenticateToken, studentController.createStudentsBatch);
router.get('/', auth.authenticateToken, studentController.getAllStudents);
router.post('/advisors/assign-range', auth.authenticateToken, studentController.assignAdvisorsByRollRange);
router.get('/advisors/inspect', auth.authenticateToken, studentController.getAdvisorAssignmentsForInspection);
router.get('/:user_id/advisors/current', auth.authenticateToken, validateParamId('user_id'), studentController.getCurrentAdvisorByStudentId);
router.get('/:user_id/advisors/history', auth.authenticateToken, validateParamId('user_id'), studentController.getAdvisorHistoryByStudentId);
router.get('/:user_id/advisors', auth.authenticateToken, validateParamId('user_id'), studentController.getAdvisorTimelineByStudentId);
router.get('/:user_id/academic-overview', auth.authenticateToken, validateParamId('user_id'), studentController.getAcademicOverview);
router.get('/roll/:roll_number', auth.authenticateToken, studentController.getStudentByRollNumber);
router.get('/:user_id', auth.authenticateToken, validateParamId('user_id'), studentController.getStudentByUserId);
router.put('/:user_id', auth.authenticateToken, validateParamId('user_id'), validateStudentUpdate, studentController.updateStudent);
router.delete('/:user_id', auth.authenticateToken, validateParamId('user_id'), studentController.deleteStudent);

// Registration routes
router.post('/:user_id/register', auth.authenticateToken, validateParamId('user_id'), studentController.registerForCourses);
router.get('/:user_id/available-courses', auth.authenticateToken, validateParamId('user_id'), studentController.getAvailableCourses);
router.get('/:user_id/registration-eligibility', auth.authenticateToken, validateParamId('user_id'), studentController.getRegistrationEligibility);
router.get('/:user_id/results', auth.authenticateToken, validateParamId('user_id'), studentController.getAllResults);
router.get('/:user_id/results/:term_number', auth.authenticateToken, validateParamId('user_id'), studentController.getResultsByTermNumber);


module.exports = router;
