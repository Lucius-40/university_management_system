const express = require('express');
const StudentController = require('../controllers/studentController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const studentController = new StudentController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, studentController.createStudent);
router.post('/batch', auth.authenticateToken, studentController.createStudentsBatch);
router.get('/', auth.authenticateToken, studentController.getAllStudents);
router.post('/advisors/assign-range', auth.authenticateToken, studentController.assignAdvisorsByRollRange);
router.get('/advisors/inspect', auth.authenticateToken, studentController.getAdvisorAssignmentsForInspection);
router.get('/:user_id/advisors/current', auth.authenticateToken, studentController.getCurrentAdvisorByStudentId);
router.get('/:user_id/advisors/history', auth.authenticateToken, studentController.getAdvisorHistoryByStudentId);
router.get('/:user_id/advisors', auth.authenticateToken, studentController.getAdvisorTimelineByStudentId);
router.get('/:user_id/academic-overview', auth.authenticateToken, studentController.getAcademicOverview);
router.get('/roll/:roll_number', auth.authenticateToken, studentController.getStudentByRollNumber);
router.get('/:user_id', auth.authenticateToken, studentController.getStudentByUserId);
router.put('/:user_id', auth.authenticateToken, studentController.updateStudent);
router.delete('/:user_id', auth.authenticateToken, studentController.deleteStudent);

// Registration routes
router.post('/:user_id/register', auth.authenticateToken, studentController.registerForCourses);
router.get('/:user_id/available-courses', auth.authenticateToken, studentController.getAvailableCourses);
router.get('/:user_id/registration-eligibility', auth.authenticateToken, studentController.getRegistrationEligibility);
router.get('/:user_id/results', auth.authenticateToken, studentController.getAllResults);
router.get('/:user_id/results/:term_number', auth.authenticateToken, studentController.getResultsByTermNumber);


module.exports = router;
