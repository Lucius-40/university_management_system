const DB_Connection = require("../database/db.js");

class SystemStateModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    getCurrentState = () => {
        return this.db.run("get_current_state", async () => {
            const query = `
                SELECT id, reg_start, reg_end, term_start, term_end, newest_term_start, updated_at, updated_by
                FROM current_state
                WHERE id = 1
                LIMIT 1;
            `;
            const result = await this.db.query_executor(query);
            return result.rows[0] || null;
        });
    }

    getStateHistory = (limit = 20) => {
        return this.db.run("get_state_history", async () => {
            const query = `
                SELECT
                    csh.id,
                    csh.changed_at,
                    csh.changed_by,
                    u.name AS changed_by_name,
                    csh.old_reg_start,
                    csh.new_reg_start,
                    csh.old_reg_end,
                    csh.new_reg_end,
                    csh.old_term_start,
                    csh.new_term_start,
                    csh.old_term_end,
                    csh.new_term_end,
                    csh.old_newest_term_start,
                    csh.new_newest_term_start,
                    csh.reason
                FROM current_state_history csh
                LEFT JOIN users u ON u.id = csh.changed_by
                ORDER BY csh.changed_at DESC
                LIMIT $1;
            `;
            const result = await this.db.query_executor(query, [limit]);
            return result.rows;
        });
    }

    getUniversitySummary = () => {
        return this.db.run("get_university_summary", async () => {
            const query = `
                SELECT
                    (SELECT COUNT(*) FROM departments) AS department_count,
                    (SELECT COUNT(*) FROM terms) AS term_count,
                    (SELECT COUNT(*) FROM courses) AS course_count,
                    (SELECT COUNT(*) FROM sections) AS section_count,
                    (SELECT COUNT(*) FROM students) AS student_count,
                    (SELECT COUNT(*) FROM teachers) AS teacher_count;
            `;
            const result = await this.db.query_executor(query);
            return result.rows[0];
        });
    }

    getDuplicateTermNumberGroups = () => {
        return this.db.run("get_duplicate_term_groups", async () => {
            const query = `
                SELECT department_id, term_number, COUNT(*) AS row_count
                FROM terms
                GROUP BY department_id, term_number
                HAVING COUNT(*) > 1
                ORDER BY department_id, term_number;
            `;
            const result = await this.db.query_executor(query);
            return result.rows;
        });
    }

    seedMissingTermsForDepartments = (term_start, term_end) => {
        return this.db.run("seed_missing_terms", async () => {
            const query = `
                INSERT INTO terms (term_number, start_date, end_date, department_id)
                SELECT
                    series.term_number,
                    $1::date AS start_date,
                    $2::date AS end_date,
                    d.id AS department_id
                FROM departments d
                CROSS JOIN generate_series(1, 8) AS series(term_number)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM terms t
                    WHERE t.department_id = d.id
                      AND t.term_number = series.term_number
                )
                RETURNING id;
            `;
            const result = await this.db.query_executor(query, [term_start, term_end]);
            return result.rowCount || 0;
        });
    }

    upsertCurrentState = ({ reg_start, reg_end, term_start, term_end, updated_by }) => {
        return this.db.run("upsert_current_state", async () => {
            const query = `
                INSERT INTO current_state (
                    id,
                    reg_start,
                    reg_end,
                    term_start,
                    term_end,
                    newest_term_start,
                    updated_by
                )
                VALUES (1, $1, $2, $3, $4, $3, $5)
                ON CONFLICT (id)
                DO UPDATE SET
                    reg_start = EXCLUDED.reg_start,
                    reg_end = EXCLUDED.reg_end,
                    term_start = EXCLUDED.term_start,
                    term_end = EXCLUDED.term_end,
                    newest_term_start = EXCLUDED.newest_term_start,
                    updated_by = EXCLUDED.updated_by
                RETURNING id, reg_start, reg_end, term_start, term_end, newest_term_start, updated_at, updated_by;
            `;

            const params = [reg_start, reg_end, term_start, term_end, updated_by];
            const result = await this.db.query_executor(query, params);
            return result.rows[0];
        });
    }
}

module.exports = SystemStateModel;
