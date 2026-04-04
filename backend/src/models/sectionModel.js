const DB_Connection = require("../database/db.js");

const extractRollSuffix = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return null;

    const suffix = digits.slice(-3);
    const numeric = Number(suffix);
    if (!Number.isInteger(numeric)) return null;
    return numeric;
};

class SectionModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createSection = (payload) => {
        return this.db.run(
            'create_section',
            async () => {
                const { term_id, name } = payload;
                const query = `
                    INSERT INTO sections (term_id, name)
                    VALUES ($1, $2)
                    RETURNING *;
                `;
                const params = [term_id, name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllSections = () => {
        return this.db.run(
            'get_all_sections',
            async () => {
                const query = `SELECT * FROM sections;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getSectionsByTermId = (term_id) => {
        return this.db.run(
            'get_sections_by_term_id',
            async () => {
                const query = `SELECT * FROM sections WHERE term_id = $1;`;
                const params = [term_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    updateSection = (payload) => {
        return this.db.run(
            'update_section',
            async () => {
                const { original_term_id, original_name, term_id, name } = payload;
                const query = `
                    UPDATE sections
                    SET term_id = $3, name = $4
                    WHERE term_id = $1 AND name = $2
                    RETURNING *;
                `;
                const params = [original_term_id, original_name, term_id, name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
    
    deleteSection = (term_id, name) => {
        return this.db.run(
            'delete_section',
            async () => {
                const query = `DELETE FROM sections WHERE term_id = $1 AND name = $2 RETURNING *;`;
                const params = [term_id, name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    assignStudentToSection = (student_id, section_name, type = 'n') => {
        return this.db.run(
            'assign_student_to_section',
            async () => {
                const normalizedType = String(type || 'n').toLowerCase();
                const persistedType = normalizedType === 'r' ? 'r' : 'n';

                const query = `
                    INSERT INTO student_sections (student_id, section_name, type)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (student_id)
                    DO UPDATE
                    SET section_name = EXCLUDED.section_name,
                        type = EXCLUDED.type
                    RETURNING *;
                `;
                const result = await this.db.query_executor(query, [student_id, section_name, persistedType]);
                return result.rows[0];
            }
        );
    }

    resolveRegistrationSection = (student_id, term_id) => {
        return this.db.run(
            'resolve_registration_section',
            async () => {
                const preferredQuery = `
                    SELECT ss.section_name
                    FROM student_sections ss
                    JOIN sections s
                      ON s.name = ss.section_name
                     AND s.term_id = $2
                    WHERE ss.student_id = $1
                        ORDER BY
                            CASE WHEN ss.type = 'n' THEN 0 ELSE 1 END,
                            ss.ctid DESC
                    LIMIT 1;
                `;
                const preferredResult = await this.db.query_executor(preferredQuery, [student_id, term_id]);

                if (preferredResult.rows.length > 0) {
                    return {
                        section_name: preferredResult.rows[0].section_name,
                        source: 'student-section',
                    };
                }

                const fallbackQuery = `
                    SELECT name AS section_name
                    FROM sections
                    WHERE term_id = $1
                    ORDER BY name
                    LIMIT 1;
                `;
                const fallbackResult = await this.db.query_executor(fallbackQuery, [term_id]);

                if (fallbackResult.rows.length > 0) {
                    return {
                        section_name: fallbackResult.rows[0].section_name,
                        source: 'term-fallback',
                    };
                }

                return null;
            }
        );
    }

    assignStudentsToSectionByRollRange = (payload) => {
        return this.db.run(
            'assign_students_to_section_by_roll_range',
            async () => {
                const {
                    department_id,
                    term_id,
                    section_name,
                    roll_start,
                    roll_end,
                } = payload;

                const departmentId = Number(department_id);
                const termId = Number(term_id);
                const rollStart = extractRollSuffix(roll_start);
                const rollEnd = extractRollSuffix(roll_end);
                const sectionName = String(section_name || '').trim();

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

                if (!sectionName) {
                    const error = new Error('section_name is required.');
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
                const onClientError = (error) => {
                    console.error('Section assignment PostgreSQL client error:', error.message);
                };
                client.on('error', onClientError);
                try {
                    await client.query('BEGIN');

                    const termResult = await client.query(
                        `
                            SELECT id, department_id
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

                    const sectionResult = await client.query(
                        `
                            SELECT 1
                            FROM sections
                            WHERE term_id = $1 AND name = $2
                            LIMIT 1;
                        `,
                        [termId, sectionName]
                    );

                    if (sectionResult.rows.length === 0) {
                        const error = new Error('Selected section does not exist in the selected term.');
                        error.statusCode = 400;
                        throw error;
                    }

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
                                                        ORDER BY roll_numeric ASC, student_id ASC;
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
                    let unchangedCount = 0;
                    const affectedStudentIds = [];

                    for (const row of matchedStudents) {
                        const studentId = Number(row.student_id);
                        const previousResult = await client.query(
                            `
                                SELECT section_name
                                FROM student_sections
                                WHERE student_id = $1
                                LIMIT 1
                                FOR UPDATE;
                            `,
                            [studentId]
                        );

                        const previousSectionName = previousResult.rows[0]?.section_name || null;
                        if (previousSectionName === sectionName) {
                            unchangedCount += 1;
                            continue;
                        }

                        await client.query(
                            `
                                INSERT INTO student_sections (student_id, section_name, type)
                                VALUES ($1, $2, 'n')
                                ON CONFLICT (student_id)
                                DO UPDATE
                                SET section_name = EXCLUDED.section_name,
                                    type = EXCLUDED.type
                                RETURNING *;
                            `,
                            [studentId, sectionName]
                        );

                        assignedCount += 1;
                        affectedStudentIds.push(studentId);
                    }

                    await client.query('COMMIT');

                    return {
                        department_id: departmentId,
                        term_id: termId,
                        section_name: sectionName,
                        roll_start: rollStart,
                        roll_end: rollEnd,
                        matched_students: matchedStudents.length,
                        assigned_count: assignedCount,
                        unchanged_count: unchangedCount,
                        invalid_roll_format_count: Number(invalidRollResult.rows[0]?.invalid_roll_count || 0),
                        affected_student_ids: affectedStudentIds,
                    };
                } catch (error) {
                    try {
                        await client.query('ROLLBACK');
                    } catch (rollbackError) {
                        console.error('Section assignment rollback failed:', rollbackError.message);
                    }
                    throw error;
                } finally {
                    client.removeListener('error', onClientError);
                    client.release();
                }
            }
        );
    }

    getStudentSection = (student_id) => {
        return this.db.run(
            'get_student_section',
            async () => {
                const query = `
                    SELECT * FROM student_sections 
                    WHERE student_id = $1
                                        ORDER BY CASE WHEN type = 'n' THEN 0 ELSE 1 END, ctid DESC
                    LIMIT 1;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    checkSectionExists = (term_id, section_name) => {
        return this.db.run(
            'check_section_exists',
            async () => {
                const query = `
                    SELECT * FROM sections 
                    WHERE term_id = $1 AND name = $2;
                `;
                const params = [term_id, section_name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

        getSectionAssignmentsForInspection = (filters = {}) => {
            return this.db.run(
                'get_section_assignments_for_inspection',
                async () => {
                    const departmentId = filters.department_id ? Number(filters.department_id) : null;
                    const termId = filters.term_id ? Number(filters.term_id) : null;
                    const sectionName = filters.section_name ? String(filters.section_name).trim() : null;

                    const query = `
                            SELECT
                                    d.id AS department_id,
                                    d.code AS department_code,
                                    d.name AS department_name,
                                    t.id AS term_id,
                                    t.term_number,
                                    ss.section_name,
                                    s.user_id AS student_id,
                                    u.name AS student_name,
                                    s.roll_number
                            FROM student_sections ss
                            JOIN students s
                                ON s.user_id = ss.student_id
                            JOIN users u
                                ON u.id = s.user_id
                            JOIN terms t
                                ON t.id = s.current_term
                            JOIN departments d
                                ON d.id = t.department_id
                            WHERE ($1::int IS NULL OR d.id = $1)
                                AND ($2::int IS NULL OR t.id = $2)
                                AND ($3::text IS NULL OR ss.section_name = $3)
                            ORDER BY ss.section_name, t.term_number, s.roll_number;
                    `;

                    const params = [departmentId, termId, sectionName || null];
                    const result = await this.db.query_executor(query, params);
                    return result.rows;
                }
            );
        }
}

module.exports = SectionModel;
