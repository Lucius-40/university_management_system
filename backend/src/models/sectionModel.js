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
}

module.exports = SectionModel;
