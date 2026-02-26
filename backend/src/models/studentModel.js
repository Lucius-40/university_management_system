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

    // Registration helper methods
    getCurrentAdvisor = (student_id) => {
        return this.db.run(
            'get_current_advisor',
            async () => {
                const query = `
                    SELECT sah.*, t.user_id, u.name as advisor_name, u.email as advisor_email
                    FROM student_advisor_history sah
                    JOIN teachers t ON sah.teacher_id = t.user_id
                    JOIN users u ON t.user_id = u.id
                    WHERE sah.student_id = $1 AND sah.end_date IS NULL
                    ORDER BY sah.start_date DESC
                    LIMIT 1;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getCompletedCourses = (student_id) => {
        return this.db.run(
            'get_completed_courses',
            async () => {
                const query = `
                    SELECT DISTINCT co.course_id, c.course_code, c.name, se.grade
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    JOIN courses c ON co.course_id = c.id
                    WHERE se.student_id = $1 
                    AND se.status = 'Enrolled'
                    AND se.grade IS NOT NULL
                    AND se.grade IN ('A+', 'A', 'A-', 'B', 'C', 'D')
                    ORDER BY co.course_id;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    hasOverdueDues = (student_id) => {
        return this.db.run(
            'has_overdue_dues',
            async () => {
                const query = `
                    SELECT sdp.*, d.name as due_name, d.amount as due_amount
                    FROM student_dues_payment sdp
                    JOIN dues d ON sdp.due_id = d.id
                    WHERE sdp.student_id = $1 
                    AND sdp.status = 'Overdue';
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    getStudentDepartment = (student_id) => {
        return this.db.run(
            'get_student_department',
            async () => {
                const query = `
                    SELECT s.user_id, s.roll_number, t.department_id, d.code, d.name as department_name
                    FROM students s
                    LEFT JOIN terms t ON s.current_term = t.id
                    LEFT JOIN departments d ON t.department_id = d.id
                    WHERE s.user_id = $1;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = StudentModel;
