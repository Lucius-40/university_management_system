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

    getActiveEnrollmentsByStudentAndTerm = (student_id, term_id) => {
        return this.db.run(
            'get_active_enrollments_by_student_and_term',
            async () => {
                const query = `
                    SELECT se.*, co.term_id, co.course_id, co.max_capacity
                    FROM student_enrollments se
                    JOIN course_offerings co ON se.course_offering_id = co.id
                    WHERE se.student_id = $1
                      AND co.term_id = $2
                      AND se.status IN ('Pending', 'Enrolled')
                    ORDER BY se.enrollment_timestamp DESC;
                `;
                const result = await this.db.query_executor(query, [student_id, term_id]);
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

    hasAnyPendingEnrollment = (student_id) => {
        return this.db.run(
            'has_any_pending_enrollment',
            async () => {
                const query = `
                    SELECT 1
                    FROM student_enrollments
                    WHERE student_id = $1
                      AND status = 'Pending'
                    LIMIT 1;
                `;
                const result = await this.db.query_executor(query, [student_id]);
                return result.rows.length > 0;
            }
        );
    }

    getActiveRetakeTermIds = (student_id) => {
        return this.db.run(
            'get_active_retake_term_ids',
            async () => {
                const query = `
                    SELECT DISTINCT co.term_id
                    FROM student_enrollments se
                    JOIN course_offerings co ON co.id = se.course_offering_id
                    WHERE se.student_id = $1
                      AND se.is_retake = true
                      AND se.status IN ('Pending', 'Enrolled')
                    ORDER BY co.term_id;
                `;
                const result = await this.db.query_executor(query, [student_id]);
                return result.rows.map((row) => Number(row.term_id)).filter((value) => Number.isInteger(value));
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
                    AND se.status IN ('Enrolled', 'Archived')
                    ORDER BY se.enrollment_timestamp DESC
                    LIMIT 1;
                `;
                const params = [student_id, course_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getCourseAttemptSummary = (student_id, course_id) => {
        return this.db.run(
            'get_course_attempt_summary',
            async () => {
                const query = `
                    WITH attempts AS (
                        SELECT
                            se.id,
                            se.grade,
                            se.enrollment_timestamp,
                            se.status
                        FROM student_enrollments se
                        JOIN course_offerings co ON co.id = se.course_offering_id
                        WHERE se.student_id = $1
                          AND co.course_id = $2
                                            AND se.status IN ('Enrolled', 'Archived')
                    )
                    SELECT
                        EXISTS (
                            SELECT 1
                            FROM attempts a
                            WHERE a.grade IN ('A+', 'A', 'A-', 'B', 'C', 'D')
                        ) AS has_passed,
                        (
                            SELECT a2.grade
                            FROM attempts a2
                            ORDER BY a2.enrollment_timestamp DESC, a2.id DESC
                            LIMIT 1
                        ) AS latest_grade,
                        (
                            SELECT COUNT(*)::INT
                            FROM attempts
                        ) AS attempt_count;
                `;

                const result = await this.db.query_executor(query, [student_id, course_id]);
                const row = result.rows[0] || {};
                return {
                    has_passed: Boolean(row.has_passed),
                    latest_grade: row.latest_grade || null,
                    attempt_count: Number(row.attempt_count || 0),
                };
            }
        );
    }

    getPendingEnrollmentsForAdvisor = (teacher_id) => {
        return this.db.run(
            'get_pending_enrollments_for_advisor',
            async () => {
                const query = `
                    SELECT
                        se.id AS enrollment_id,
                        se.student_id,
                        se.course_offering_id,
                        se.credit_when_taking,
                        se.enrollment_timestamp,
                        s.roll_number,
                        u.name AS student_name,
                        u.email AS student_email,
                        c.id AS course_id,
                        c.course_code,
                        c.name AS course_name,
                        c.credit_hours,
                        t.id AS term_id,
                        t.term_number,
                        d.id AS department_id,
                        d.code AS department_code,
                        d.name AS department_name
                    FROM student_enrollments se
                    JOIN students s
                      ON s.user_id = se.student_id
                    JOIN users u
                      ON u.id = s.user_id
                    JOIN student_advisor_history sah
                      ON sah.student_id = s.user_id
                     AND sah.end_date IS NULL
                    JOIN course_offerings co
                      ON co.id = se.course_offering_id
                    JOIN courses c
                      ON c.id = co.course_id
                    JOIN terms t
                      ON t.id = co.term_id
                    LEFT JOIN departments d
                      ON d.id = t.department_id
                    WHERE se.status = 'Pending'
                      AND sah.teacher_id = $1
                    ORDER BY se.enrollment_timestamp ASC, s.roll_number ASC, c.course_code ASC;
                `;

                const result = await this.db.query_executor(query, [teacher_id]);
                return result.rows;
            }
        );
    }

    isTeacherCurrentAdvisorOfStudent = (teacher_id, student_id) => {
        return this.db.run(
            'is_teacher_current_advisor_of_student',
            async () => {
                const query = `
                    SELECT 1
                    FROM student_advisor_history sah
                    WHERE sah.teacher_id = $1
                      AND sah.student_id = $2
                      AND sah.end_date IS NULL
                    LIMIT 1;
                `;

                const result = await this.db.query_executor(query, [teacher_id, student_id]);
                return result.rows.length > 0;
            }
        );
    }

    setEnrollmentDecisionIfPending = (enrollment_id, status, teacher_id = null) => {
        return this.db.run(
            'set_enrollment_decision_if_pending',
            async () => {
                const isApproved = status === 'Enrolled';
                const query = `
                    UPDATE student_enrollments
                    SET
                        status = $2::enrollment_status_enum,
                        approved_timestamp = CASE
                            WHEN $2::enrollment_status_enum = 'Enrolled'::enrollment_status_enum THEN NOW()
                            ELSE NULL
                        END,
                        approved_by_teacher_id = CASE
                            WHEN $2::enrollment_status_enum = 'Enrolled'::enrollment_status_enum THEN $3::INT
                            ELSE NULL
                        END
                    WHERE id = $1
                      AND status = 'Pending'
                    RETURNING *;
                `;

                const result = await this.db.query_executor(query, [
                    enrollment_id,
                    status,
                    isApproved ? teacher_id : null,
                ]);
                return result.rows[0] || null;
            }
        );
    }

    approveAllPendingForStudentByAdvisor = (student_id, teacher_id) => {
        return this.db.run(
            'approve_all_pending_for_student_by_advisor',
            async () => {
                const query = `
                    WITH target_enrollments AS (
                        SELECT se.id
                        FROM student_enrollments se
                        JOIN student_advisor_history sah
                          ON sah.student_id = se.student_id
                         AND sah.end_date IS NULL
                        WHERE se.student_id = $1::INT
                          AND se.status = 'Pending'
                          AND sah.teacher_id = $2::INT
                    )
                    UPDATE student_enrollments se
                    SET
                        status = 'Enrolled'::enrollment_status_enum,
                        approved_timestamp = NOW(),
                        approved_by_teacher_id = $2::INT
                    WHERE se.id IN (SELECT id FROM target_enrollments)
                    RETURNING se.*;
                `;

                const result = await this.db.query_executor(query, [student_id, teacher_id]);
                return result.rows;
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
                    WHERE se.student_id = $1
                                            AND se.status IN ('Enrolled', 'Archived')
                                        ORDER BY t.term_number ASC, t.start_date ASC;
                `;
                                const params = [student_id];
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

        getStudentCoursesForTermWithTeacher = (student_id, term_id) => {
                return this.db.run(
                        'get_student_courses_for_term_with_teacher',
                        async () => {
                                const query = `
                                        SELECT
                                                se.id AS enrollment_id,
                                                se.course_offering_id,
                                                se.status AS enrollment_status,
                                                se.grade,
                                                se.is_retake,
                                                se.credit_when_taking,
                                                se.enrollment_timestamp,
                                                co.is_optional,
                                                co.max_capacity,
                                                c.id AS course_id,
                                                c.course_code,
                                                c.name AS course_name,
                                                c.credit_hours,
                                                COALESCE(teach_pick.section_name, ss.section_name) AS section_name,
                                                teach_pick.teacher_id,
                                                tu.name AS teacher_name,
                                                tu.email AS teacher_email,
                                                tt.official_mail AS teacher_official_mail,
                                                tt.appointment::text AS teacher_appointment,
                                                td.code AS teacher_department_code,
                                                td.name AS teacher_department_name
                                        FROM student_enrollments se
                                        JOIN course_offerings co
                                            ON co.id = se.course_offering_id
                                        JOIN courses c
                                            ON c.id = co.course_id
                                        LEFT JOIN student_sections ss
                                            ON ss.student_id = se.student_id
                                        LEFT JOIN LATERAL (
                                                SELECT te.teacher_id, te.section_name
                                                FROM teaches te
                                                WHERE te.course_offering_id = se.course_offering_id
                                                    AND (ss.section_name IS NULL OR te.section_name = ss.section_name)
                                                ORDER BY
                                                        CASE
                                                                WHEN ss.section_name IS NOT NULL AND te.section_name = ss.section_name THEN 0
                                                                ELSE 1
                                                        END,
                                                        te.teacher_id
                                                LIMIT 1
                                        ) teach_pick ON TRUE
                                        LEFT JOIN teachers tt
                                            ON tt.user_id = teach_pick.teacher_id
                                        LEFT JOIN users tu
                                            ON tu.id = tt.user_id
                                        LEFT JOIN departments td
                                            ON td.id = tt.department_id
                                        WHERE se.student_id = $1
                                            AND co.term_id = $2
                                            AND se.status IN ('Pending', 'Enrolled', 'Archived')
                                        ORDER BY c.course_code ASC, se.enrollment_timestamp ASC, se.id ASC;
                                `;

                                const result = await this.db.query_executor(query, [student_id, term_id]);
                                return result.rows;
                        }
                );
        }
}

module.exports = EnrollmentModel;
