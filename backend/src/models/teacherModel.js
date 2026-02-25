const DB_Connection = require("../database/db.js");

class TeacherModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createTeacher = (payload) => {
        return this.db.run(
            'create_teacher',
            async () => {
                const { user_id, appointment, official_mail, department_id } = payload;
                const query = `
                    INSERT INTO teachers (user_id, appointment, official_mail, department_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;
                `;
                const params = [user_id, appointment, official_mail, department_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllTeachers = () => {
        return this.db.run(
            'get_all_teachers',
            async () => {
                const query = `SELECT * FROM teachers;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getTeacherByUserId = (user_id) => {
        return this.db.run(
            'get_teacher_by_user_id',
            async () => {
                const query = `SELECT * FROM teachers WHERE user_id = $1;`;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateTeacher = (user_id, payload) => {
        return this.db.run(
            'update_teacher',
            async () => {
                const { appointment, official_mail, department_id } = payload;
                const query = `
                    UPDATE teachers
                    SET appointment = $2, official_mail = $3, department_id = $4
                    WHERE user_id = $1
                    RETURNING *;
                `;
                const params = [user_id, appointment, official_mail, department_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteTeacher = (user_id) => {
        return this.db.run(
            'delete_teacher',
            async () => {
                const query = `DELETE FROM teachers WHERE user_id = $1 RETURNING *;`;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = TeacherModel;
