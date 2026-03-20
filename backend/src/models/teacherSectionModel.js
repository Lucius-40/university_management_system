const DB_Connection = require("../database/db.js");

class TeacherSectionModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    /**
     * Get all sections taught by a teacher in current terms
     * @param {number} teacherId - The teacher's user_id
     * @returns {Promise<Array>} List of sections with department and course info
     */
    getTeacherSections = (teacherId) => {
        return this.db.run(
            'get_teacher_sections',
            async () => {
                const query = `SELECT * FROM get_teacher_sections($1);`;
                const params = [teacherId];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    /**
     * Get all students in a specific section taught by a teacher
     * @param {number} teacherId - The teacher's user_id
     * @param {string} sectionName - The section name
     * @param {number} departmentId - The department ID
     * @returns {Promise<Array>} List of enrolled students in the section
     */
    getStudentsInSection = (teacherId, sectionName, departmentId) => {
        return this.db.run(
            'get_students_in_teacher_section',
            async () => {
                const query = `SELECT * FROM get_students_in_teacher_section($1, $2, $3);`;
                const params = [teacherId, sectionName, departmentId];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    assignTeacherToSection = (payload) => {
        return this.db.run(
            'assign_teacher_to_section',
            async () => {
                const courseOfferingId = Number(payload?.course_offering_id);
                const teacherId = Number(payload?.teacher_id);
                const sectionName = String(payload?.section_name || '').trim();
                const replaceExisting = Boolean(payload?.replace_existing);

                if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
                    const error = new Error('course_offering_id must be a positive integer.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!Number.isInteger(teacherId) || teacherId <= 0) {
                    const error = new Error('teacher_id must be a positive integer.');
                    error.statusCode = 400;
                    throw error;
                }

                if (!sectionName) {
                    const error = new Error('section_name is required.');
                    error.statusCode = 400;
                    throw error;
                }

                const client = await this.db.pool.connect();
                try {
                    await client.query('BEGIN');

                    const offeringResult = await client.query(
                        `
                            SELECT id, term_id, is_active
                            FROM course_offerings
                            WHERE id = $1
                            LIMIT 1;
                        `,
                        [courseOfferingId]
                    );

                    if (offeringResult.rows.length === 0) {
                        const error = new Error('course_offering_id does not exist.');
                        error.statusCode = 404;
                        throw error;
                    }

                    const offering = offeringResult.rows[0];
                    if (offering.is_active === false) {
                        const error = new Error('The selected course offering is inactive.');
                        error.statusCode = 400;
                        throw error;
                    }

                    const teacherResult = await client.query(
                        `
                            SELECT user_id
                            FROM teachers
                            WHERE user_id = $1
                            LIMIT 1;
                        `,
                        [teacherId]
                    );

                    if (teacherResult.rows.length === 0) {
                        const error = new Error('teacher_id does not exist.');
                        error.statusCode = 404;
                        throw error;
                    }

                    const sectionResult = await client.query(
                        `
                            SELECT 1
                            FROM sections
                            WHERE term_id = $1
                              AND name = $2
                            LIMIT 1;
                        `,
                        [offering.term_id, sectionName]
                    );

                    if (sectionResult.rows.length === 0) {
                        const error = new Error('section_name does not exist in the offering term.');
                        error.statusCode = 400;
                        throw error;
                    }

                    const existingResult = await client.query(
                        `
                            SELECT course_offering_id, section_name, teacher_id
                            FROM teaches
                            WHERE course_offering_id = $1
                              AND section_name = $2
                            LIMIT 1
                            FOR UPDATE;
                        `,
                        [courseOfferingId, sectionName]
                    );

                    const existing = existingResult.rows[0] || null;
                    if (!existing) {
                        const inserted = await client.query(
                            `
                                INSERT INTO teaches (course_offering_id, teacher_id, section_name)
                                VALUES ($1, $2, $3)
                                RETURNING course_offering_id, teacher_id, section_name;
                            `,
                            [courseOfferingId, teacherId, sectionName]
                        );

                        await client.query('COMMIT');
                        return {
                            action: 'inserted',
                            assignment: inserted.rows[0],
                        };
                    }

                    if (Number(existing.teacher_id) === teacherId) {
                        await client.query('COMMIT');
                        return {
                            action: 'unchanged',
                            assignment: {
                                course_offering_id: courseOfferingId,
                                teacher_id: teacherId,
                                section_name: sectionName,
                            },
                        };
                    }

                    if (!replaceExisting) {
                        const error = new Error('This offering+section is already assigned. Set replace_existing=true to reassign.');
                        error.statusCode = 409;
                        error.details = {
                            existing_teacher_id: Number(existing.teacher_id),
                            course_offering_id: courseOfferingId,
                            section_name: sectionName,
                        };
                        throw error;
                    }

                    const updated = await client.query(
                        `
                            UPDATE teaches
                            SET teacher_id = $3
                            WHERE course_offering_id = $1
                              AND section_name = $2
                            RETURNING course_offering_id, teacher_id, section_name;
                        `,
                        [courseOfferingId, sectionName, teacherId]
                    );

                    await client.query('COMMIT');
                    return {
                        action: 'updated',
                        assignment: updated.rows[0],
                    };
                } catch (error) {
                    try {
                        await client.query('ROLLBACK');
                    } catch (rollbackError) {
                        console.error('Rollback failed in assignTeacherToSection:', rollbackError);
                    }
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    }

        getTeachingAssignments = (filters = {}) => {
                return this.db.run(
                        'get_teaching_assignments',
                        async () => {
                                const departmentId = filters.department_id ? Number(filters.department_id) : null;
                                const termId = filters.term_id ? Number(filters.term_id) : null;
                                const courseOfferingId = filters.course_offering_id ? Number(filters.course_offering_id) : null;
                                const teacherId = filters.teacher_id ? Number(filters.teacher_id) : null;

                                const query = `
                                        SELECT
                                                t.course_offering_id,
                                                t.section_name,
                                                t.teacher_id,
                                                tr.id AS term_id,
                                                tr.term_number,
                                                d.id AS department_id,
                                                d.code AS department_code,
                                                d.name AS department_name,
                                                c.id AS course_id,
                                                c.course_code,
                                                c.name AS course_name,
                                                u.name AS teacher_name,
                                                te.appointment AS teacher_appointment
                                        FROM teaches t
                                        JOIN course_offerings co
                                            ON co.id = t.course_offering_id
                                        JOIN terms tr
                                            ON tr.id = co.term_id
                                        JOIN courses c
                                            ON c.id = co.course_id
                                        JOIN departments d
                                            ON d.id = tr.department_id
                                        JOIN teachers te
                                            ON te.user_id = t.teacher_id
                                        JOIN users u
                                            ON u.id = te.user_id
                                        WHERE ($1::int IS NULL OR d.id = $1)
                                            AND ($2::int IS NULL OR tr.id = $2)
                                            AND ($3::int IS NULL OR t.course_offering_id = $3)
                                            AND ($4::int IS NULL OR t.teacher_id = $4)
                                        ORDER BY d.code, tr.term_number, c.course_code, t.section_name, u.name;
                                `;

                                const params = [departmentId, termId, courseOfferingId, teacherId];
                                const result = await this.db.query_executor(query, params);
                                return result.rows;
                        }
                );
        }
}

module.exports = new TeacherSectionModel();
