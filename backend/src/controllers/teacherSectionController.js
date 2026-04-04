const TeacherSectionModel = require('../models/teacherSectionModel.js');

class TeacherSectionController {
    getTeachingAssignments = async (req, res) => {
        try {
            if (req.user?.role !== 'system') {
                return res.status(403).json({ error: 'Only system admin can inspect teaching assignments.' });
            }

            const rows = await TeacherSectionModel.getTeachingAssignments(req.query || {});
            res.status(200).json({ assignments: rows });
        } catch (error) {
            console.error('Get Teaching Assignments error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    assignTeacherToSection = async (req, res) => {
        try {
            if (req.user?.role !== 'system') {
                return res.status(403).json({ error: 'Only system admin can assign teachers to sections.' });
            }

            const result = await TeacherSectionModel.assignTeacherToSection(req.body || {});
            const statusCode = result.action === 'inserted' ? 201 : 200;
            res.status(statusCode).json(result);
        } catch (error) {
            console.error('Assign Teacher To Section error:', error);
            const statusCode = Number(error.statusCode) || 500;

            if (error.details) {
                return res.status(statusCode).json({
                    error: error.message,
                    details: error.details,
                });
            }

            res.status(statusCode).json({ error: error.message });
        }
    }

    getTeacherSections = async (req, res) => {
        try {
            const teacherId = req.user.id;
            const sections = await TeacherSectionModel.getTeacherSections(teacherId);
            
            if (!sections || sections.length === 0) {
                return res.status(404).json({ 
                    message: "No sections found for this teacher in current terms" 
                });
            }
            
            res.status(200).json(sections);
        } catch (error) {
            console.error("Get Teacher Sections error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getStudentsInSection = async (req, res) => {
        try {
            const teacherId = req.user.id;
            const { sectionName, departmentId } = req.params;
            
            if (!sectionName || !departmentId) {
                return res.status(400).json({ 
                    message: "Section name and department ID are required" 
                });
            }
            
            const students = await TeacherSectionModel.getStudentsInSection(
                teacherId, 
                sectionName, 
                parseInt(departmentId)
            );
            
            if (!students || students.length === 0) {
                return res.status(404).json({ 
                    message: "No enrolled students found in this section" 
                });
            }
            
            res.status(200).json(students);
        } catch (error) {
            console.error("Get Students In Section error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new TeacherSectionController();
