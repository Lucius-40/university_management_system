const DB_Connection = require("../database/db.js");

class TermModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createTerm = (payload) => {
        return this.db.run(
            'create_term',
            async () => {
                const { term_number, start_date, end_date, department_id, max_credit } = payload;
                const query = `
                    INSERT INTO terms (term_number, start_date, end_date, department_id, max_credit)
                    VALUES ($1, $2, $3, $4, COALESCE($5, 23.0))
                    RETURNING *;
                `;
                const params = [term_number, start_date, end_date, department_id, max_credit];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllTerms = () => {
        return this.db.run(
            'get_all_terms',
            async () => {
                const query = `SELECT * FROM terms;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getTermById = (id) => {
        return this.db.run(
            'get_term_by_id',
            async () => {
                const query = `SELECT * FROM terms WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateTerm = (id, payload) => {
        return this.db.run(
            'update_term',
            async () => {
                const { term_number, department_id, max_credit } = payload;
                const query = `
                    UPDATE terms
                    SET term_number = COALESCE($2, term_number),
                        department_id = COALESCE($3, department_id),
                        max_credit = COALESCE($4, max_credit)
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, term_number, department_id, max_credit];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteTerm = (id) => {
        return this.db.run(
            'delete_term',
            async () => {
                const query = `DELETE FROM terms WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = TermModel;
