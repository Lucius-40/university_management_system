const DB_Connection = require("../database/db.js");

class SectionModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createSection = (payload) => {
        return this.db.run(
            'create_section',
            async () => {
                const { term_id, name } = payload;
                const query = `
                    INSERT INTO sections (term_id, name)
                    VALUES ($1, $2)
                    RETURNING *;
                `;
                const params = [term_id, name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllSections = () => {
        return this.db.run(
            'get_all_sections',
            async () => {
                const query = `SELECT * FROM sections;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getSectionsByTermId = (term_id) => {
        return this.db.run(
            'get_sections_by_term_id',
            async () => {
                const query = `SELECT * FROM sections WHERE term_id = $1;`;
                const params = [term_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }
    
    deleteSection = (term_id, name) => {
        return this.db.run(
            'delete_section',
            async () => {
                const query = `DELETE FROM sections WHERE term_id = $1 AND name = $2 RETURNING *;`;
                const params = [term_id, name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    // Student section assignment methods
    assignStudentToSection = (student_id, section_name) => {
        return this.db.run(
            'assign_student_to_section',
            async () => {
                const query = `
                    INSERT INTO student_sections (student_id, section_name)
                    VALUES ($1, $2)
                    RETURNING *;
                `;
                const params = [student_id, section_name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getStudentSection = (student_id) => {
        return this.db.run(
            'get_student_section',
            async () => {
                const query = `
                    SELECT * FROM student_sections 
                    WHERE student_id = $1
                    ORDER BY section_name DESC
                    LIMIT 1;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    checkSectionExists = (term_id, section_name) => {
        return this.db.run(
            'check_section_exists',
            async () => {
                const query = `
                    SELECT * FROM sections 
                    WHERE term_id = $1 AND name = $2;
                `;
                const params = [term_id, section_name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = SectionModel;
