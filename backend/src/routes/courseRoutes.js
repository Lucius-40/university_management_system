const express = require('express');
const CourseController = require('../controllers/courseController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const courseController = new CourseController();
const auth = new AuthenticateToken();

router.post('/', auth.authenticateToken, courseController.createCourse);
router.get('/', auth.authenticateToken, courseController.getAllCourses);
router.get('/:id', auth.authenticateToken, courseController.getCourseById);
router.put('/:id', auth.authenticateToken, courseController.updateCourse);
router.delete('/:id', auth.authenticateToken, courseController.deleteCourse);

router.post('/offerings', auth.authenticateToken, courseController.createCourseOffering);
router.get('/offerings/:id', auth.authenticateToken, courseController.getCourseOfferingById);

module.exports = router;
