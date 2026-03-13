const DB_Connection = require("../database/db.js");

class CourseModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    normalizeCourseType = (type) => {
        const value = String(type || '').trim().toLowerCase();
        if (value === 'lab') return 'Lab';
        return 'Theory';
    }

    normalizePrereqIds = (prereq_ids = []) => {
        if (!Array.isArray(prereq_ids)) return [];

        return [...new Set(
            prereq_ids
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0)
        )];
    }

    replaceCoursePrerequisites = async (client, courseId, prereqIds = []) => {
        await client.query(`DELETE FROM course_prerequisites WHERE course_id = $1;`, [courseId]);

        if (prereqIds.length === 0) {
            return;
        }

        const query = `
            INSERT INTO course_prerequisites (course_id, prereq_id)
            SELECT $1, UNNEST($2::int[])
            ON CONFLICT (course_id, prereq_id) DO NOTHING;
        `;
        await client.query(query, [courseId, prereqIds]);
    }

    createCourse = (payload) => {
        return this.db.run(
            'create_course',
            async () => {
                const { course_code, name, credit_hours, type, department_id, prereq_ids = [] } = payload;
                const rawPrereqIds = this.normalizePrereqIds(prereq_ids);
                const normalizedType = this.normalizeCourseType(type);

                const client = await this.db.pool.connect();
                try {
                    await client.query('BEGIN');

                    const query = `
                        INSERT INTO courses (course_code, name, credit_hours, type, department_id)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *;
                    `;
                    const params = [course_code, name, credit_hours, normalizedType, department_id];
                    const result = await client.query(query, params);
                    const course = result.rows[0];

                    const prereqIds = rawPrereqIds.filter((id) => id !== Number(course.id));
                    await this.replaceCoursePrerequisites(client, course.id, prereqIds);

                    await client.query('COMMIT');
                    return { ...course, prereq_ids: prereqIds };
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    }

    getAllCourses = () => {
        return this.db.run(
            'get_all_courses',
            async () => {
                const query = `
                    SELECT
                        c.*,
                        COALESCE(
                            ARRAY_AGG(cp.prereq_id ORDER BY cp.prereq_id)
                            FILTER (WHERE cp.prereq_id IS NOT NULL),
                            ARRAY[]::INT[]
                        ) AS prereq_ids
                    FROM courses c
                    LEFT JOIN course_prerequisites cp ON cp.course_id = c.id
                    GROUP BY c.id
                    ORDER BY c.course_code;
                `;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getCourseById = (id) => {
        return this.db.run(
            'get_course_by_id',
            async () => {
                const query = `
                    SELECT
                        c.*,
                        COALESCE(
                            ARRAY_AGG(cp.prereq_id ORDER BY cp.prereq_id)
                            FILTER (WHERE cp.prereq_id IS NOT NULL),
                            ARRAY[]::INT[]
                        ) AS prereq_ids
                    FROM courses c
                    LEFT JOIN course_prerequisites cp ON cp.course_id = c.id
                    WHERE c.id = $1
                    GROUP BY c.id;
                `;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateCourse = (id, payload) => {
        return this.db.run(
            'update_course',
            async () => {
                const { course_code, name, credit_hours, type, department_id, prereq_ids = [] } = payload;
                const courseId = Number(id);
                const prereqIds = this.normalizePrereqIds(prereq_ids).filter((prereqId) => prereqId !== courseId);
                const normalizedType = this.normalizeCourseType(type);

                const client = await this.db.pool.connect();
                try {
                    await client.query('BEGIN');

                    const query = `
                        UPDATE courses
                        SET course_code = $2, name = $3, credit_hours = $4, type = $5, department_id = $6
                        WHERE id = $1
                        RETURNING *;
                    `;
                    const params = [id, course_code, name, credit_hours, normalizedType, department_id];
                    const result = await client.query(query, params);
                    const course = result.rows[0];

                    if (!course) {
                        await client.query('COMMIT');
                        return null;
                    }

                    await this.replaceCoursePrerequisites(client, courseId, prereqIds);

                    await client.query('COMMIT');
                    return { ...course, prereq_ids: prereqIds };
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    }

    deleteCourse = (id) => {
        return this.db.run(
            'delete_course',
            async () => {
                await this.db.query_executor(
                    `DELETE FROM course_prerequisites WHERE course_id = $1 OR prereq_id = $1;`,
                    [id]
                );
                const query = `DELETE FROM courses WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    createCourseOffering = (payload) => {
        return this.db.run(
            'create_course_offering',
            async () => {
                const { term_id, course_id, max_capacity } = payload;
                const query = `
                    INSERT INTO course_offerings (term_id, course_id, max_capacity)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [term_id, course_id, max_capacity];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
    
    getCourseOfferingById = (id) => {
        return this.db.run(
            'get_course_offering_by_id',
            async () => {
                const query = `SELECT * FROM course_offerings WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    // Registration helper methods
    getCourseOfferingsByTerm = (term_id, department_id = null) => {
        return this.db.run(
            'get_course_offerings_by_term',
            async () => {
                let query = `
                    SELECT co.*, c.course_code, c.name, c.credit_hours, c.type, c.department_id
                    FROM course_offerings co
                    JOIN courses c ON co.course_id = c.id
                    WHERE co.term_id = $1
                `;
                const params = [term_id];
                
                if (department_id) {
                    query += ` AND c.department_id = $2`;
                    params.push(department_id);
                }
                
                query += ` ORDER BY c.course_code;`;
                
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    getCoursePrerequisites = (course_id) => {
        return this.db.run(
            'get_course_prerequisites',
            async () => {
                const query = `
                    SELECT cp.prereq_id, c.course_code, c.name
                    FROM course_prerequisites cp
                    JOIN courses c ON cp.prereq_id = c.id
                    WHERE cp.course_id = $1;
                `;
                const params = [course_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    getCourseOfferingEnrollmentCount = (course_offering_id) => {
        return this.db.run(
            'get_course_offering_enrollment_count',
            async () => {
                const query = `
                    SELECT COUNT(*) as enrollment_count
                    FROM student_enrollments
                    WHERE course_offering_id = $1
                    AND status IN ('Pending', 'Enrolled');
                `;
                const params = [course_offering_id];
                const result = await this.db.query_executor(query, params);
                return parseInt(result.rows[0].enrollment_count);
            }
        );
    }

    getCourseOfferingDetails = (course_offering_id) => {
        return this.db.run(
            'get_course_offering_details',
            async () => {
                const query = `
                    SELECT co.*, c.course_code, c.name, c.credit_hours, c.type, c.department_id
                    FROM course_offerings co
                    JOIN courses c ON co.course_id = c.id
                    WHERE co.id = $1;
                `;
                const params = [course_offering_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = CourseModel;
