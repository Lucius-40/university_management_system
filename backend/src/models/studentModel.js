const DB_Connection = require("../database/db.js");

const extractRollSuffix = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return null;

    const suffix = Number(digits.slice(-3));
    if (!Number.isInteger(suffix)) return null;
    return suffix;
};

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

    getStudentRollOptions = (filters = {}) => {
        return this.db.run(
            'get_student_roll_options',
            async () => {
                const departmentId = Number(filters.department_id);
                const termId = Number(filters.term_id);
                const search = String(filters.search || '').trim();
                const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);

                if (!Number.isInteger(departmentId) || departmentId <= 0) {
                    const error = new Error('department_id is required.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isInteger(termId) || termId <= 0) {
                    const error = new Error('term_id is required.');
                    error.statusCode = 400;
                    throw error;
                }

                const query = `
                    SELECT
                        s.user_id AS student_id,
                        s.roll_number,
                        u.name AS student_name,
                        CAST(RIGHT(NULLIF(regexp_replace(s.roll_number, '[^0-9]', '', 'g'), ''), 3) AS INTEGER) AS roll_suffix
                    FROM students s
                    JOIN users u ON u.id = s.user_id
                    JOIN terms t ON t.id = s.current_term
                    WHERE t.department_id = $1
                      AND t.id = $2
                      AND (
                        $3::text = ''
                        OR s.roll_number ILIKE '%' || $3 || '%'
                        OR u.name ILIKE '%' || $3 || '%'
                      )
                    ORDER BY s.roll_number ASC
                    LIMIT $4;
                `;

                const result = await this.db.query_executor(query, [departmentId, termId, search, limit]);
                return result.rows;
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

    setCurrentTermByUserId = (user_id, term_id) => {
        return this.db.run(
            'set_current_term_by_user_id',
            async () => {
                const query = `
                    UPDATE students
                    SET current_term = $2
                    WHERE user_id = $1
                    RETURNING *;
                `;
                const result = await this.db.query_executor(query, [user_id, term_id]);
                return result.rows[0] || null;
            }
        );
    }

    getDepartmentTermByNumber = (department_id, term_number) => {
        return this.db.run(
            'get_department_term_by_number',
            async () => {
                const query = `
                    SELECT id, term_number, department_id, start_date, end_date
                    FROM terms
                    WHERE department_id = $1
                      AND term_number = $2
                    ORDER BY start_date DESC
                    LIMIT 1;
                `;
                const result = await this.db.query_executor(query, [department_id, term_number]);
                return result.rows[0] || null;
            }
        );
    }

    // Registration helper methods
    getCurrentAdviseesByTeacherId = (teacher_id) => {
        return this.db.run(
            'get_current_advisees_by_teacher_id',
            async () => {
                const query = `
                    SELECT
                        s.user_id AS student_id,
                        s.roll_number,
                        s.status AS student_status,
                        u.name AS student_name,
                        COALESCE(s.official_mail, u.email) AS student_email,
                        t.id AS current_term_id,
                        t.term_number AS current_term_number,
                        d.id AS department_id,
                        d.code AS department_code,
                        d.name AS department_name,
                        sah.start_date AS advisor_since,
                        COALESCE(pending.pending_count, 0) AS pending_enrollments_count,
                        COALESCE(enrolled.enrolled_count, 0) AS active_or_archived_enrollments_count
                    FROM student_advisor_history sah
                    JOIN students s ON s.user_id = sah.student_id
                    JOIN users u ON u.id = s.user_id
                    LEFT JOIN terms t ON t.id = s.current_term
                    LEFT JOIN departments d ON d.id = t.department_id
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*)::int AS pending_count
                        FROM student_enrollments se
                        WHERE se.student_id = s.user_id
                          AND se.status = 'Pending'
                    ) pending ON TRUE
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*)::int AS enrolled_count
                        FROM student_enrollments se
                        WHERE se.student_id = s.user_id
                          AND se.status IN ('Enrolled', 'Archived')
                    ) enrolled ON TRUE
                    WHERE sah.teacher_id = $1
                      AND sah.end_date IS NULL
                    ORDER BY s.roll_number, s.user_id;
                `;

                const result = await this.db.query_executor(query, [teacher_id]);
                return result.rows;
            }
        );
    }

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
                    AND se.status IN ('Enrolled', 'Archived')
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

    getBlockingDuesForRegistration = (student_id, term_id = null) => {
        return this.db.run(
            'get_blocking_dues_for_registration',
            async () => {
                const query = `
                    SELECT
                        sdp.*,
                        d.name as due_name,
                        d.amount as due_amount,
                        COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount
                    FROM student_dues_payment sdp
                    JOIN dues d ON sdp.due_id = d.id
                    WHERE sdp.student_id = $1
                      AND COALESCE(sdp.required_for_registration, d.required_for_registration, TRUE) = TRUE
                      AND COALESCE(d.is_active, TRUE) = TRUE
                      AND sdp.waived_at IS NULL
                      AND ($2::INT IS NULL OR sdp.term_id IS NULL OR sdp.term_id = $2)
                      AND COALESCE(sdp.amount_paid, 0) < COALESCE(sdp.amount_due_override, d.amount)
                    ORDER BY COALESCE(sdp.due_date, sdp.deadline) NULLS LAST, sdp.id;
                `;
                const params = [student_id, term_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    hasOverdueDues = (student_id) => {
        return this.getBlockingDuesForRegistration(student_id, null);
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

        getCurrentAcademicContextByStudentId = (student_id) => {
                return this.db.run(
                        'get_current_academic_context_by_student_id',
                        async () => {
                                const query = `
                                        SELECT
                                                s.user_id AS student_id,
                                                s.roll_number,
                                                s.official_mail,
                                                s.status AS student_status,
                                                u.name AS student_name,
                                                u.email AS student_email,
                                                u.profile_image_url,
                                                t.id AS term_id,
                                                t.term_number,
                                                t.start_date AS term_start_date,
                                                t.end_date AS term_end_date,
                                                t.max_credit,
                                                d.id AS department_id,
                                                d.code AS department_code,
                                                d.name AS department_name,
                                                advisor.teacher_id AS advisor_id,
                                                advisor.advisor_name,
                                                advisor.advisor_email,
                                                advisor.advisor_appointment
                                        FROM students s
                                        JOIN users u
                                            ON u.id = s.user_id
                                        LEFT JOIN terms t
                                            ON t.id = s.current_term
                                        LEFT JOIN departments d
                                            ON d.id = t.department_id
                                        LEFT JOIN LATERAL (
                                                SELECT
                                                        sah.teacher_id,
                                                        tu.name AS advisor_name,
                                                        COALESCE(tt.official_mail, tu.email) AS advisor_email,
                                                        tt.appointment::text AS advisor_appointment
                                                FROM student_advisor_history sah
                                                JOIN teachers tt
                                                    ON tt.user_id = sah.teacher_id
                                                JOIN users tu
                                                    ON tu.id = tt.user_id
                                                WHERE sah.student_id = s.user_id
                                                    AND sah.end_date IS NULL
                                                ORDER BY sah.start_date DESC, sah.id DESC
                                                LIMIT 1
                                        ) advisor ON TRUE
                                        WHERE s.user_id = $1
                                        LIMIT 1;
                                `;

                                const result = await this.db.query_executor(query, [student_id]);
                                return result.rows[0] || null;
                        }
                );
        }

    getCurrentAdvisorByStudentId = (student_id) => {
        return this.db.run(
            'get_current_advisor_by_student_id',
            async () => {
                const query = `
                    SELECT
                        sah.id,
                        sah.student_id,
                        sah.teacher_id,
                        sah.start_date,
                        sah.end_date,
                        sah.change_reason,
                        u.name AS advisor_name,
                        COALESCE(t.official_mail, u.email) AS advisor_email,
                        t.appointment,
                        t.department_id
                    FROM student_advisor_history sah
                    JOIN teachers t ON t.user_id = sah.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE sah.student_id = $1
                      AND sah.end_date IS NULL
                    ORDER BY sah.start_date DESC, sah.id DESC
                    LIMIT 1;
                `;

                const result = await this.db.query_executor(query, [student_id]);
                return result.rows[0] || null;
            }
        );
    }

    getAdvisorHistoryByStudentId = (student_id) => {
        return this.db.run(
            'get_advisor_history_by_student_id',
            async () => {
                const query = `
                    SELECT
                        sah.id,
                        sah.student_id,
                        sah.teacher_id,
                        sah.start_date,
                        sah.end_date,
                        sah.change_reason,
                        u.name AS advisor_name,
                        COALESCE(t.official_mail, u.email) AS advisor_email,
                        t.appointment,
                        t.department_id
                    FROM student_advisor_history sah
                    JOIN teachers t ON t.user_id = sah.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE sah.student_id = $1
                      AND sah.end_date IS NOT NULL
                    ORDER BY sah.end_date DESC, sah.start_date DESC, sah.id DESC;
                `;

                const result = await this.db.query_executor(query, [student_id]);
                return result.rows;
            }
        );
    }

    getAdvisorTimelineByStudentId = (student_id) => {
        return this.db.run(
            'get_advisor_timeline_by_student_id',
            async () => {
                const query = `
                    SELECT
                        sah.id,
                        sah.student_id,
                        sah.teacher_id,
                        sah.start_date,
                        sah.end_date,
                        sah.change_reason,
                        u.name AS advisor_name,
                        COALESCE(t.official_mail, u.email) AS advisor_email,
                        t.appointment,
                        t.department_id
                    FROM student_advisor_history sah
                    JOIN teachers t ON t.user_id = sah.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE sah.student_id = $1
                    ORDER BY (sah.end_date IS NULL) DESC, sah.start_date DESC, sah.id DESC;
                `;

                const result = await this.db.query_executor(query, [student_id]);
                return result.rows;
            }
        );
    }

    assignAdvisorsByRollRange = (payload) => {
        return this.db.run(
            'assign_advisors_by_roll_range',
            async () => {
                const {
                    department_id,
                    term_id,
                    teacher_id,
                    roll_start,
                    roll_end,
                    start_date,
                    change_reason,
                } = payload;

                const departmentId = Number(department_id);
                const termId = Number(term_id);
                const teacherId = Number(teacher_id);
                const rollStart = extractRollSuffix(roll_start);
                const rollEnd = extractRollSuffix(roll_end);

                if (!Number.isInteger(departmentId) || departmentId <= 0) {
                    const error = new Error('department_id is required.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isInteger(termId) || termId <= 0) {
                    const error = new Error('term_id is required.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isInteger(teacherId) || teacherId <= 0) {
                    const error = new Error('teacher_id is required.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isInteger(rollStart) || !Number.isInteger(rollEnd)) {
                    const error = new Error('roll_start and roll_end must contain numeric digits.');
                    error.statusCode = 400;
                    throw error;
                }

                if (rollStart > rollEnd) {
                    const error = new Error('roll_start must be less than or equal to roll_end.');
                    error.statusCode = 400;
                    throw error;
                }

                const client = await this.db.pool.connect();
                try {
                    await client.query('BEGIN');

                    const teacherResult = await client.query(
                        `
                            SELECT user_id
                            FROM teachers
                            WHERE user_id = $1
                              AND department_id = $2
                            LIMIT 1;
                        `,
                        [teacherId, departmentId]
                    );

                    if (teacherResult.rows.length === 0) {
                        const error = new Error('Selected teacher does not belong to the selected department.');
                        error.statusCode = 400;
                        throw error;
                    }

                    const termResult = await client.query(
                        `
                            SELECT id, department_id, start_date
                            FROM terms
                            WHERE id = $1
                            LIMIT 1;
                        `,
                        [termId]
                    );

                    if (termResult.rows.length === 0) {
                        const error = new Error('Selected term was not found.');
                        error.statusCode = 404;
                        throw error;
                    }

                    const term = termResult.rows[0];
                    if (Number(term.department_id) !== departmentId) {
                        const error = new Error('Selected term does not belong to the selected department.');
                        error.statusCode = 400;
                        throw error;
                    }

                    const normalizedStartDate = String(start_date || '').trim();
                    const effectiveStartDate = normalizedStartDate || String(term.start_date).slice(0, 10);

                    const studentsResult = await client.query(
                        `
                            WITH student_rolls AS (
                                SELECT
                                    s.user_id AS student_id,
                                    s.roll_number,
                                    NULLIF(regexp_replace(s.roll_number, '[^0-9]', '', 'g'), '') AS roll_digits
                                FROM students s
                                JOIN terms t ON t.id = s.current_term
                                WHERE t.department_id = $1
                                  AND t.id = $2
                            )
                            SELECT
                                student_id,
                                roll_number,
                                CAST(RIGHT(roll_digits, 3) AS INTEGER) AS roll_numeric
                            FROM student_rolls
                            WHERE roll_digits IS NOT NULL
                              AND CAST(RIGHT(roll_digits, 3) AS INTEGER) BETWEEN $3 AND $4
                            ORDER BY roll_numeric ASC, student_id ASC
                            FOR UPDATE;
                        `,
                        [departmentId, termId, rollStart, rollEnd]
                    );

                    const invalidRollResult = await client.query(
                        `
                            WITH student_rolls AS (
                                SELECT
                                    NULLIF(regexp_replace(s.roll_number, '[^0-9]', '', 'g'), '') AS roll_digits
                                FROM students s
                                JOIN terms t ON t.id = s.current_term
                                WHERE t.department_id = $1
                                  AND t.id = $2
                            )
                            SELECT COUNT(*)::INTEGER AS invalid_roll_count
                            FROM student_rolls
                            WHERE roll_digits IS NULL;
                        `,
                        [departmentId, termId]
                    );

                    const matchedStudents = studentsResult.rows;
                    if (matchedStudents.length === 0) {
                        const error = new Error('No students found in the selected roll range for the selected department and term.');
                        error.statusCode = 404;
                        throw error;
                    }

                    let assignedCount = 0;
                    let skippedSameAdvisorCount = 0;
                    const affectedStudentIds = [];

                    for (const row of matchedStudents) {
                        const studentId = Number(row.student_id);

                        const currentAdvisorResult = await client.query(
                            `
                                SELECT id, teacher_id, start_date
                                FROM student_advisor_history
                                WHERE student_id = $1
                                  AND end_date IS NULL
                                ORDER BY start_date DESC, id DESC
                                LIMIT 1
                                FOR UPDATE;
                            `,
                            [studentId]
                        );

                        const currentAdvisor = currentAdvisorResult.rows[0] || null;
                        if (currentAdvisor && Number(currentAdvisor.teacher_id) === teacherId) {
                            skippedSameAdvisorCount += 1;
                            continue;
                        }

                        if (currentAdvisor) {
                            const currentStartDate = String(currentAdvisor.start_date).slice(0, 10);
                            if (effectiveStartDate <= currentStartDate) {
                                const error = new Error(
                                    `Cannot reassign student ${studentId}: start_date must be after existing advisor start_date (${currentStartDate}).`
                                );
                                error.statusCode = 409;
                                throw error;
                            }

                            await client.query(
                                `
                                    UPDATE student_advisor_history
                                    SET end_date = ($2::date - INTERVAL '1 day')::date
                                    WHERE id = $1;
                                `,
                                [currentAdvisor.id, effectiveStartDate]
                            );
                        }

                        const overlapResult = await client.query(
                            `
                                SELECT id
                                FROM student_advisor_history
                                WHERE student_id = $1
                                  AND NOT (
                                    COALESCE(end_date, 'infinity'::date) < $2::date
                                    OR COALESCE($3::date, 'infinity'::date) < start_date
                                  )
                                LIMIT 1;
                            `,
                            [studentId, effectiveStartDate, null]
                        );

                        if (overlapResult.rows.length > 0) {
                            const error = new Error(
                                `Advisor timeline overlap detected for student ${studentId}.`
                            );
                            error.statusCode = 409;
                            throw error;
                        }

                        await client.query(
                            `
                                INSERT INTO student_advisor_history (
                                    student_id,
                                    teacher_id,
                                    start_date,
                                    end_date,
                                    change_reason
                                )
                                VALUES ($1, $2, $3, NULL, $4);
                            `,
                            [studentId, teacherId, effectiveStartDate, String(change_reason || '').trim() || null]
                        );

                        assignedCount += 1;
                        affectedStudentIds.push(studentId);
                    }

                    await client.query('COMMIT');

                    return {
                        department_id: departmentId,
                        term_id: termId,
                        teacher_id: teacherId,
                        roll_start: rollStart,
                        roll_end: rollEnd,
                        start_date: effectiveStartDate,
                        matched_students: matchedStudents.length,
                        assigned_count: assignedCount,
                        skipped_same_advisor_count: skippedSameAdvisorCount,
                        invalid_roll_format_count: Number(invalidRollResult.rows[0]?.invalid_roll_count || 0),
                        affected_student_ids: affectedStudentIds,
                    };
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    }

        getAdvisorAssignmentsForInspection = (filters = {}) => {
                return this.db.run(
                        'get_advisor_assignments_for_inspection',
                        async () => {
                                const departmentId = filters.department_id ? Number(filters.department_id) : null;
                                const termId = filters.term_id ? Number(filters.term_id) : null;
                                const teacherId = filters.teacher_id ? Number(filters.teacher_id) : null;

                                const query = `
                                        SELECT
                                                d.id AS department_id,
                                                d.code AS department_code,
                                                d.name AS department_name,
                                                t.id AS term_id,
                                                t.term_number,
                                                ah.teacher_id,
                                                tu.name AS advisor_name,
                                                tt.appointment AS advisor_appointment,
                                                s.user_id AS student_id,
                                                su.name AS student_name,
                                                s.roll_number,
                                                ah.start_date,
                                                ah.change_reason
                                        FROM student_advisor_history ah
                                        JOIN students s
                                            ON s.user_id = ah.student_id
                                        JOIN users su
                                            ON su.id = s.user_id
                                        JOIN terms t
                                            ON t.id = s.current_term
                                        JOIN departments d
                                            ON d.id = t.department_id
                                        JOIN teachers tt
                                            ON tt.user_id = ah.teacher_id
                                        JOIN users tu
                                            ON tu.id = tt.user_id
                                        WHERE ah.end_date IS NULL
                                            AND ($1::int IS NULL OR d.id = $1)
                                            AND ($2::int IS NULL OR t.id = $2)
                                            AND ($3::int IS NULL OR ah.teacher_id = $3)
                                        ORDER BY tu.name, t.term_number, s.roll_number;
                                `;

                                const params = [departmentId, termId, teacherId];
                                const result = await this.db.query_executor(query, params);
                                return result.rows;
                        }
                );
        }
}

module.exports = StudentModel;
