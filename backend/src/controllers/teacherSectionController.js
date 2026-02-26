const TeacherSectionModel = require('../models/teacherSectionModel.js');

class TeacherSectionController {
    /**
     * Get all sections taught by the authenticated teacher in current terms
     */
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

    /**
     * Get all students in a specific section taught by the authenticated teacher
     */
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
