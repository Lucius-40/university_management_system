const DB_Connection = require("../database/db.js");

class TeacherSectionModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    /**
     * Get all sections taught by a teacher in current terms
     * @param {number} teacherId - The teacher's user_id
     * @returns {Promise<Array>} List of sections with department and course info
     */
    getTeacherSections = (teacherId) => {
        return this.db.run(
            'get_teacher_sections',
            async () => {
                const query = `SELECT * FROM get_teacher_sections($1);`;
                const params = [teacherId];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    /**
     * Get all students in a specific section taught by a teacher
     * @param {number} teacherId - The teacher's user_id
     * @param {string} sectionName - The section name
     * @param {number} departmentId - The department ID
     * @returns {Promise<Array>} List of enrolled students in the section
     */
    getStudentsInSection = (teacherId, sectionName, departmentId) => {
        return this.db.run(
            'get_students_in_teacher_section',
            async () => {
                const query = `SELECT * FROM get_students_in_teacher_section($1, $2, $3);`;
                const params = [teacherId, sectionName, departmentId];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }
}

module.exports = new TeacherSectionModel();
