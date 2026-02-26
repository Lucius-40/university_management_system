const express = require('express');
const TeacherSectionController = require('../controllers/teacherSectionController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const auth = new AuthenticateToken();

// Get all sections taught by the authenticated teacher in current terms
router.get('/my-sections', auth.authenticateToken, TeacherSectionController.getTeacherSections);

// Get all students in a specific section taught by the authenticated teacher
router.get('/sections/:sectionName/department/:departmentId/students', 
    auth.authenticateToken, 
    TeacherSectionController.getStudentsInSection
);

module.exports = router;
