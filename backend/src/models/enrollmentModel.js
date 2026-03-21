const DB_Connection = require("../database/db.js");

class EnrollmentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createEnrollment = (payload) => {
        return this.db.run(
            'create_enrollment',
            async () => {
                const { 
                    student_id, 
                    course_offering_id, 
                    credit_when_taking, 
                    status, 
                    is_retake 
                } = payload;
                const query = `
                    INSERT INTO student_enrollments 
                    (student_id, course_offering_id, credit_when_taking, status, is_retake)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const params = [student_id, course_offering_id, credit_when_taking, status || 'Pending', is_retake || false];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getEnrollmentsByStudent = (student_id, term_id = null) => {
        return this.db.run(
            'get_enrollments_by_student',
            async () => {
                let query = `
                    SELECT se.*, co.term_id, co.course_id, co.max_capacity
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                `;
                const params = [student_id];
                
                if (term_id) {
                    query += ` WHERE se.student_id = $1 AND co.term_id = $2`;
                    params.push(term_id);
                } else {
                    query += ` WHERE se.student_id = $1`;
                }
                
                query += ` ORDER BY se.enrollment_timestamp DESC;`;
                
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    checkExistingEnrollment = (student_id, course_offering_id) => {
        return this.db.run(
            'check_existing_enrollment',
            async () => {
                const query = `
                    SELECT * FROM student_enrollments
                    WHERE student_id = $1 AND course_offering_id = $2
                    AND status IN ('Pending', 'Enrolled');
                `;
                const params = [student_id, course_offering_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getTotalCreditsForTerm = (student_id, term_id) => {
        return this.db.run(
            'get_total_credits_for_term',
            async () => {
                const query = `
                    SELECT COALESCE(SUM(se.credit_when_taking), 0) as total_credits
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    WHERE se.student_id = $1 
                    AND co.term_id = $2
                    AND se.status IN ('Pending', 'Enrolled');
                `;
                const params = [student_id, term_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0].total_credits;
            }
        );
    }

    updateEnrollmentStatus = (enrollment_id, status, approved_by_teacher_id = null) => {
        return this.db.run(
            'update_enrollment_status',
            async () => {
                const query = `
                    UPDATE student_enrollments
                    SET status = $2, 
                        approved_timestamp = $3,
                        approved_by_teacher_id = $4
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [
                    enrollment_id, 
                    status, 
                    status === 'Enrolled' ? new Date() : null,
                    approved_by_teacher_id
                ];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getEnrollmentById = (enrollment_id) => {
        return this.db.run(
            'get_enrollment_by_id',
            async () => {
                const query = `
                    SELECT se.*, co.term_id, co.course_id, co.max_capacity,
                           c.course_code, c.name as course_name, c.credit_hours
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    JOIN courses c ON co.course_id = c.id
                    WHERE se.id = $1;
                `;
                const params = [enrollment_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    checkPreviousEnrollment = (student_id, course_id) => {
        return this.db.run(
            'check_previous_enrollment',
            async () => {
                const query = `
                    SELECT se.*, se.grade
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    WHERE se.student_id = $1 
                    AND co.course_id = $2
                    AND se.status = 'Enrolled'
                    ORDER BY se.enrollment_timestamp DESC
                    LIMIT 1;
                `;
                const params = [student_id, course_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getStudentResultTerms = (student_id, includeCurrentTerm = false) => {
        return this.db.run(
            'get_student_result_terms',
            async () => {
                const query = `
                    SELECT DISTINCT
                        t.id,
                        t.term_number,
                        t.start_date,
                        t.end_date,
                        t.department_id
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    JOIN terms t ON t.id = co.term_id
                    JOIN students s ON s.user_id = se.student_id
                    JOIN terms current_term ON current_term.id = s.current_term
                    WHERE se.student_id = $1
                      AND se.status = 'Enrolled'
                      AND (
                        t.term_number < current_term.term_number
                        OR ($2::BOOLEAN = TRUE AND t.term_number = current_term.term_number)
                      )
                    ORDER BY t.term_number ASC;
                `;
                const params = [student_id, includeCurrentTerm];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    getStudentTermResults = (student_id, term_id) => {
        return this.db.run(
            'get_student_term_results',
            async () => {
                const query = `
                    SELECT *
                    FROM compile_student_term_result($1, $2)
                    ORDER BY course_code;
                `;
                const params = [student_id, term_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }
}

module.exports = EnrollmentModel;
