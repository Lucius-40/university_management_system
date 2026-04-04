const express = require('express');
const TeacherSectionController = require('../controllers/teacherSectionController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const auth = new AuthenticateToken();

router.get('/assignments', auth.authenticateToken, TeacherSectionController.getTeachingAssignments);

router.post('/assign', auth.authenticateToken, TeacherSectionController.assignTeacherToSection);

router.get('/my-sections', auth.authenticateToken, TeacherSectionController.getTeacherSections);

router.get('/sections/:sectionName/department/:departmentId/students', 
    auth.authenticateToken, 
    TeacherSectionController.getStudentsInSection
);

module.exports = router;
