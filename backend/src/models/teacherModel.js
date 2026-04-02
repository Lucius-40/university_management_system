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

    searchTeachers = (filters = {}) => {
        return this.db.run(
            'search_teachers',
            async () => {
                const departmentId = Number.isInteger(Number(filters.department_id))
                    ? Number(filters.department_id)
                    : null;
                const offeringId = Number.isInteger(Number(filters.offering_id))
                    ? Number(filters.offering_id)
                    : null;

                const limit = Number.isInteger(Number(filters.limit)) ? Number(filters.limit) : 40;
                const offset = Number.isInteger(Number(filters.offset)) ? Number(filters.offset) : 0;

                const rawSearch = String(filters.search || '').trim();
                const escapedSearch = rawSearch.replace(/[\\%_]/g, '\\$&');
                const searchPattern = escapedSearch ? `%${escapedSearch}%` : null;

                const query = `
                    SELECT
                        t.user_id,
                        u.name,
                        u.email,
                        t.official_mail,
                        t.appointment::text AS appointment,
                        t.department_id,
                        d.code AS department_code,
                        d.name AS department_name,
                        CASE
                            WHEN $3::INT IS NULL THEN FALSE
                            ELSE EXISTS (
                                SELECT 1
                                FROM teaches te
                                WHERE te.teacher_id = t.user_id
                                  AND te.course_offering_id = $3
                            )
                        END AS is_assigned_to_offering,
                        COALESCE(section_stats.active_section_count, 0) AS active_section_count,
                        COUNT(*) OVER() AS total_count
                    FROM teachers t
                    JOIN users u
                      ON u.id = t.user_id
                    LEFT JOIN departments d
                      ON d.id = t.department_id
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*)::int AS active_section_count
                        FROM teaches te
                        WHERE te.teacher_id = t.user_id
                    ) section_stats ON TRUE
                    WHERE ($1::INT IS NULL OR t.department_id = $1)
                      AND (
                        $2::TEXT IS NULL
                        OR u.name ILIKE $2 ESCAPE '\\'
                        OR u.email ILIKE $2 ESCAPE '\\'
                        OR COALESCE(t.official_mail, '') ILIKE $2 ESCAPE '\\'
                        OR COALESCE(t.appointment::text, '') ILIKE $2 ESCAPE '\\'
                        OR CAST(t.user_id AS TEXT) ILIKE $2 ESCAPE '\\'
                      )
                    ORDER BY u.name ASC, t.user_id ASC
                    LIMIT $4 OFFSET $5;
                `;

                const params = [departmentId, searchPattern, offeringId, limit, offset];
                const result = await this.db.query_executor(query, params);
                const rows = result.rows || [];
                const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

                return {
                    rows,
                    total,
                    limit,
                    offset,
                };
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

    getTeacherContextByUserId = (user_id) => {
        return this.db.run(
            'get_teacher_context_by_user_id',
            async () => {
                const query = `
                    SELECT
                        t.user_id,
                        u.name,
                        u.email,
                        u.mobile_number,
                        t.official_mail,
                        t.appointment,
                        t.department_id,
                        d.code AS department_code,
                        d.name AS department_name,
                        EXISTS (
                            SELECT 1
                            FROM department_heads dh
                            WHERE dh.teacher_id = t.user_id
                              AND dh.department_id = t.department_id
                              AND dh.end_date IS NULL
                        ) AS is_active_department_head,
                        (
                            SELECT dh.start_date
                            FROM department_heads dh
                            WHERE dh.teacher_id = t.user_id
                              AND dh.department_id = t.department_id
                              AND dh.end_date IS NULL
                            ORDER BY dh.start_date DESC, dh.id DESC
                            LIMIT 1
                        ) AS department_head_start_date
                    FROM teachers t
                    JOIN users u ON u.id = t.user_id
                    LEFT JOIN departments d ON d.id = t.department_id
                    WHERE t.user_id = $1
                    LIMIT 1;
                `;
                const result = await this.db.query_executor(query, [user_id]);
                return result.rows[0] || null;
            }
        );
    }

    getDepartmentFacultySnapshot = (department_id) => {
        return this.db.run(
            'get_department_faculty_snapshot',
            async () => {
                const query = `
                    SELECT
                        t.user_id,
                        u.name,
                        COALESCE(t.official_mail, u.email) AS email,
                        t.appointment,
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM department_heads dh
                                WHERE dh.department_id = t.department_id
                                  AND dh.teacher_id = t.user_id
                                  AND dh.end_date IS NULL
                            ) THEN TRUE
                            ELSE FALSE
                        END AS is_current_department_head,
                        (
                            SELECT COUNT(*)::int
                            FROM teaches te
                            JOIN course_offerings co ON co.id = te.course_offering_id
                            JOIN terms tr ON tr.id = co.term_id
                            WHERE te.teacher_id = t.user_id
                              AND tr.department_id = t.department_id
                              AND COALESCE(co.is_active, TRUE) = TRUE
                        ) AS active_section_count
                    FROM teachers t
                    JOIN users u ON u.id = t.user_id
                    WHERE t.department_id = $1
                    ORDER BY
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM department_heads dh
                                WHERE dh.department_id = t.department_id
                                  AND dh.teacher_id = t.user_id
                                  AND dh.end_date IS NULL
                            ) THEN 0
                            ELSE 1
                        END,
                        u.name;
                `;
                const result = await this.db.query_executor(query, [department_id]);
                return result.rows;
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
