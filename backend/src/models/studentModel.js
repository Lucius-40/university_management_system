const DB_Connection = require("../database/db.js");

class StudentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createStudent = (payload) => {
        return this.db.run(
            'create_student',
            async () => {
                const { user_id, roll_number, official_mail, status, current_term } = payload;
                const query = `
                    INSERT INTO students (user_id, roll_number, official_mail, status, current_term)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const params = [user_id, roll_number, official_mail, status, current_term];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllStudents = () => {
        return this.db.run(
            'get_all_students',
            async () => {
                const query = `SELECT * FROM students;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getStudentByUserId = (user_id) => {
        return this.db.run(
            'get_student_by_user_id',
            async () => {
                const query = `SELECT * FROM students WHERE user_id = $1;`;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getStudentByRollNumber = (roll_number) => {
        return this.db.run(
            'get_student_by_roll_number',
            async () => {
                const query = `SELECT * FROM students WHERE roll_number = $1;`;
                const params = [roll_number];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateStudent = (user_id, payload) => {
        return this.db.run(
            'update_student',
            async () => {
                const { roll_number, official_mail, status, current_term } = payload;
                const query = `
                    UPDATE students
                    SET roll_number = $2, official_mail = $3, status = $4, current_term = $5
                    WHERE user_id = $1
                    RETURNING *;
                `;
                const params = [user_id, roll_number, official_mail, status, current_term];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteStudent = (user_id) => {
        return this.db.run(
            'delete_student',
            async () => {
                const query = `DELETE FROM students WHERE user_id = $1 RETURNING *;`;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = StudentModel;
