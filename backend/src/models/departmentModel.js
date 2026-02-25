const DB_Connection = require("../database/db.js");

class DepartmentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createDepartment = (payload) => {
        return this.db.run(
            'create_department',
            async () => {
                const { code, name, department_head_id } = payload;
                const query = `
                    INSERT INTO departments (code, name, department_head_id)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [code, name, department_head_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllDepartments = () => {
        return this.db.run(
            'get_all_departments',
            async () => {
                const query = `SELECT * FROM departments;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getDepartmentById = (id) => {
        return this.db.run(
            'get_department_by_id',
            async () => {
                const query = `SELECT * FROM departments WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateDepartment = (id, payload) => {
        return this.db.run(
            'update_department',
            async () => {
                const { code, name, department_head_id } = payload;
                const query = `
                    UPDATE departments
                    SET code = $2, name = $3, department_head_id = $4
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, code, name, department_head_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteDepartment = (id) => {
        return this.db.run(
            'delete_department',
            async () => {
                const query = `DELETE FROM departments WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = DepartmentModel;
