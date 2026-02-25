const DB_Connection = require("../database/db.js");

class MarkingModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createMarkingComponent = (payload) => {
        return this.db.run(
            'create_marking_component',
            async () => {
                const { enrollment_id, type, total_marks, marks_obtained, status } = payload;
                const query = `
                    INSERT INTO marking_components (enrollment_id, type, total_marks, marks_obtained, status)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const params = [enrollment_id, type, total_marks, marks_obtained, status];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllMarkingComponents = () => {
        return this.db.run(
            'get_all_marking_components',
            async () => {
                const query = `SELECT * FROM marking_components;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getMarkingComponentById = (id) => {
        return this.db.run(
            'get_marking_component_by_id',
            async () => {
                const query = `SELECT * FROM marking_components WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateMarkingComponent = (id, payload) => {
        return this.db.run(
            'update_marking_component',
            async () => {
                const { enrollment_id, type, total_marks, marks_obtained, status } = payload;
                const query = `
                    UPDATE marking_components
                    SET enrollment_id = $2, type = $3, total_marks = $4, marks_obtained = $5, status = $6
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, enrollment_id, type, total_marks, marks_obtained, status];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteMarkingComponent = (id) => {
        return this.db.run(
            'delete_marking_component',
            async () => {
                const query = `DELETE FROM marking_components WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = MarkingModel;
