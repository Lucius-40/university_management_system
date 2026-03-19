const DB_Connection = require("../database/db.js");

class DepartmentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createDepartment = (payload) => {
        return this.db.run(
            "create_department",
            async () => {
                const { code, name, department_head_id } = payload;
                const query = `
                    INSERT INTO departments (code, name, department_head_id)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [code, name, department_head_id || null];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    };

    getAllDepartments = () => {
        return this.db.run(
            "get_all_departments",
            async () => {
                const query = `SELECT * FROM departments ORDER BY code ASC, name ASC;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    };

    getDepartmentById = (id) => {
        return this.db.run(
            "get_department_by_id",
            async () => {
                const query = `SELECT * FROM departments WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    };

    updateDepartment = (id, payload) => {
        return this.db.run(
            "update_department",
            async () => {
                const { code, name, department_head_id } = payload;
                const query = `
                    UPDATE departments
                    SET code = $2, name = $3, department_head_id = $4
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, code, name, department_head_id || null];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    };

    deleteDepartment = (id) => {
        return this.db.run(
            "delete_department",
            async () => {
                const query = `DELETE FROM departments WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    };

    getDepartmentFullDetails = (identifier) => {
        return this.db.run(
            "get_department_full_details",
            async () => {
                const query = `SELECT get_department_full_details($1) AS details;`;
                const params = [identifier];
                const result = await this.db.query_executor(query, params);
                return result.rows[0]?.details || null;
            }
        );
    };

    getCurrentDepartmentHead = (departmentId) => {
        return this.db.run(
            "get_current_department_head",
            async () => {
                const query = `
                    SELECT
                        dh.id,
                        dh.department_id,
                        dh.teacher_id,
                        dh.start_date,
                        dh.end_date,
                        u.name,
                        COALESCE(t.official_mail, u.email) AS email,
                        t.appointment
                    FROM department_heads dh
                    JOIN teachers t ON t.user_id = dh.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE dh.department_id = $1
                      AND dh.end_date IS NULL
                    ORDER BY dh.start_date DESC, dh.id DESC
                    LIMIT 1;
                `;
                const result = await this.db.query_executor(query, [departmentId]);
                return result.rows[0] || null;
            }
        );
    };

    getDepartmentHeadHistory = (departmentId) => {
        return this.db.run(
            "get_department_head_history",
            async () => {
                const query = `
                    SELECT
                        dh.id,
                        dh.department_id,
                        dh.teacher_id,
                        dh.start_date,
                        dh.end_date,
                        u.name,
                        COALESCE(t.official_mail, u.email) AS email,
                        t.appointment
                    FROM department_heads dh
                    JOIN teachers t ON t.user_id = dh.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE dh.department_id = $1
                      AND dh.end_date IS NOT NULL
                    ORDER BY dh.end_date DESC, dh.start_date DESC, dh.id DESC;
                `;
                const result = await this.db.query_executor(query, [departmentId]);
                return result.rows;
            }
        );
    };

    getDepartmentHeadTimeline = (departmentId) => {
        return this.db.run(
            "get_department_head_timeline",
            async () => {
                const query = `
                    SELECT
                        dh.id,
                        dh.department_id,
                        dh.teacher_id,
                        dh.start_date,
                        dh.end_date,
                        u.name,
                        COALESCE(t.official_mail, u.email) AS email,
                        t.appointment
                    FROM department_heads dh
                    JOIN teachers t ON t.user_id = dh.teacher_id
                    JOIN users u ON u.id = t.user_id
                    WHERE dh.department_id = $1
                    ORDER BY (dh.end_date IS NULL) DESC, dh.start_date DESC, dh.id DESC;
                `;
                const result = await this.db.query_executor(query, [departmentId]);
                return result.rows;
            }
        );
    };

    assignDepartmentHead = (departmentId, payload) => {
        return this.db.run(
            "assign_department_head",
            async () => {
                const { teacher_id, start_date, end_date } = payload;

                if (!teacher_id) {
                    const error = new Error("teacher_id is required.");
                    error.statusCode = 400;
                    throw error;
                }

                if (end_date !== undefined && String(end_date || "").trim() !== "") {
                    const error = new Error("end_date is not allowed while assigning current department head.");
                    error.statusCode = 400;
                    throw error;
                }

                const client = await this.db.pool.connect();
                try {
                    await client.query("BEGIN");

                    const normalizedStartDate = String(start_date || "").trim();
                    let resolvedStartDate = normalizedStartDate;
                    if (!resolvedStartDate) {
                        const nowResult = await client.query(`SELECT CURRENT_DATE::text AS current_date;`);
                        resolvedStartDate = nowResult.rows[0]?.current_date;
                    }

                    if (!resolvedStartDate) {
                        const error = new Error("Unable to resolve start_date.");
                        error.statusCode = 500;
                        throw error;
                    }

                    const teacherCheck = await client.query(
                        `
                            SELECT user_id
                            FROM teachers
                            WHERE user_id = $1
                              AND department_id = $2
                            LIMIT 1;
                        `,
                        [Number(teacher_id), Number(departmentId)]
                    );

                    if (teacherCheck.rows.length === 0) {
                        const error = new Error("Teacher not found in this department.");
                        error.statusCode = 400;
                        throw error;
                    }

                    const currentHeadCheck = await client.query(
                        `
                            SELECT id, teacher_id, start_date
                            FROM department_heads
                            WHERE department_id = $1
                              AND end_date IS NULL
                            ORDER BY start_date DESC, id DESC
                            LIMIT 1;
                        `,
                        [Number(departmentId)]
                    );

                    const currentHead = currentHeadCheck.rows[0] || null;
                    if (currentHead && Number(currentHead.teacher_id) === Number(teacher_id)) {
                        await client.query("COMMIT");
                        return currentHead;
                    }

                    if (currentHead) {
                        const closeDateResult = await client.query(
                            `SELECT ($1::date - INTERVAL '1 day')::date AS close_date;`,
                            [resolvedStartDate]
                        );
                        const closeDate = closeDateResult.rows[0]?.close_date;

                        if (!closeDate) {
                            const error = new Error("Unable to compute previous head end date.");
                            error.statusCode = 500;
                            throw error;
                        }

                        if (String(closeDate) < String(currentHead.start_date)) {
                            const error = new Error("start_date is too early to reassign current department head.");
                            error.statusCode = 400;
                            throw error;
                        }

                        await client.query(
                            `
                                UPDATE department_heads
                                SET end_date = $2::date
                                WHERE id = $1;
                            `,
                            [Number(currentHead.id), closeDate]
                        );
                    }

                    const overlapCheck = await client.query(
                        `
                            SELECT id
                            FROM department_heads
                            WHERE department_id = $1
                              AND NOT (
                                  COALESCE(end_date, 'infinity'::date) < $2::date
                                  OR COALESCE($3::date, 'infinity'::date) < start_date
                              )
                            LIMIT 1;
                        `,
                        [Number(departmentId), resolvedStartDate, null]
                    );

                    if (overlapCheck.rows.length > 0) {
                        const error = new Error("Date range overlaps an existing department head assignment.");
                        error.statusCode = 409;
                        throw error;
                    }

                    const insertResult = await client.query(
                        `
                            INSERT INTO department_heads (department_id, teacher_id, start_date, end_date)
                            VALUES ($1, $2, $3, $4)
                            RETURNING *;
                        `,
                        [Number(departmentId), Number(teacher_id), resolvedStartDate, null]
                    );

                    await client.query("COMMIT");
                    return insertResult.rows[0];
                } catch (error) {
                    await client.query("ROLLBACK");
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    };

    updateDepartmentHeadTimelineEntry = (departmentId, entryId, payload) => {
        return this.db.run(
            "update_department_head_timeline_entry",
            async () => {
                const { teacher_id, start_date, end_date } = payload;
                const hasTeacher = teacher_id !== undefined;
                const hasStartDate = start_date !== undefined;
                const hasEndDate = end_date !== undefined;

                if (!hasTeacher && !hasStartDate && !hasEndDate) {
                    const error = new Error("Nothing to update.");
                    error.statusCode = 400;
                    throw error;
                }

                const client = await this.db.pool.connect();
                try {
                    await client.query("BEGIN");

                    const existingResult = await client.query(
                        `
                            SELECT *
                            FROM department_heads
                            WHERE id = $1
                              AND department_id = $2
                            LIMIT 1;
                        `,
                        [Number(entryId), Number(departmentId)]
                    );

                    if (existingResult.rows.length === 0) {
                        const error = new Error("Department head timeline entry not found.");
                        error.statusCode = 404;
                        throw error;
                    }

                    const current = existingResult.rows[0];
                    const nextTeacherId = hasTeacher ? Number(teacher_id) : Number(current.teacher_id);
                    const nextStartDate = hasStartDate ? String(start_date || "").trim() : current.start_date;
                    const nextEndDate = hasEndDate
                        ? (end_date ? String(end_date).trim() : null)
                        : current.end_date;

                    if (!nextStartDate) {
                        const error = new Error("start_date is required.");
                        error.statusCode = 400;
                        throw error;
                    }

                    if (nextEndDate && nextEndDate < nextStartDate) {
                        const error = new Error("end_date must be later than or equal to start_date.");
                        error.statusCode = 400;
                        throw error;
                    }

                    const teacherCheck = await client.query(
                        `
                            SELECT user_id
                            FROM teachers
                            WHERE user_id = $1
                              AND department_id = $2
                            LIMIT 1;
                        `,
                        [nextTeacherId, Number(departmentId)]
                    );

                    if (teacherCheck.rows.length === 0) {
                        const error = new Error("Teacher not found in this department.");
                        error.statusCode = 400;
                        throw error;
                    }

                    const overlapCheck = await client.query(
                        `
                            SELECT id
                            FROM department_heads
                            WHERE department_id = $1
                              AND id <> $2
                              AND NOT (
                                  COALESCE(end_date, 'infinity'::date) < $3::date
                                  OR COALESCE($4::date, 'infinity'::date) < start_date
                              )
                            LIMIT 1;
                        `,
                        [Number(departmentId), Number(entryId), nextStartDate, nextEndDate]
                    );

                    if (overlapCheck.rows.length > 0) {
                        const error = new Error("Date range overlaps an existing department head assignment.");
                        error.statusCode = 409;
                        throw error;
                    }

                    if (!nextEndDate) {
                        const currentHeadCheck = await client.query(
                            `
                                SELECT id
                                FROM department_heads
                                WHERE department_id = $1
                                  AND id <> $2
                                  AND end_date IS NULL
                                LIMIT 1;
                            `,
                            [Number(departmentId), Number(entryId)]
                        );

                        if (currentHeadCheck.rows.length > 0) {
                            const error = new Error("A current department head already exists. Close it first.");
                            error.statusCode = 409;
                            throw error;
                        }
                    }

                    const updateResult = await client.query(
                        `
                            UPDATE department_heads
                            SET teacher_id = $3,
                                start_date = $4,
                                end_date = $5
                            WHERE id = $1
                              AND department_id = $2
                            RETURNING *;
                        `,
                        [Number(entryId), Number(departmentId), nextTeacherId, nextStartDate, nextEndDate]
                    );

                    await client.query("COMMIT");
                    return updateResult.rows[0] || null;
                } catch (error) {
                    await client.query("ROLLBACK");
                    throw error;
                } finally {
                    client.release();
                }
            }
        );
    };
}

module.exports = DepartmentModel;
