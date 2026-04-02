const DB_Connection = require("../database/db.js");

const ALLOWED_MARK_TYPES = new Set(['CT', 'Midterm', 'Attendance', 'Final']);
const ALLOWED_MARKING_STATUS = new Set(['Published', 'Draft']);
const TYPE_MAX_TOTAL = {
    CT: 20,
    Midterm: 50,
    Attendance: 30,
    Final: 210,
};

const normalizeMarkType = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'ct') return 'CT';
    if (raw === 'midterm') return 'Midterm';
    if (raw === 'attendance') return 'Attendance';
    if (raw === 'final') return 'Final';
    return null;
};

const normalizeMarkingStatus = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'Published';
    if (raw === 'published') return 'Published';
    if (raw === 'draft') return 'Draft';
    return null;
};

const toPositiveNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num;
};

const toNonNegativeNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
};

class MarkingModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createMarkingComponent = (payload) => {
        return this.db.run(
            'create_marking_component',
            async () => {
                const { enrollment_id, type, total_marks, marks_obtained, status } = payload;
                const query = `
                    INSERT INTO marking_components (enrollment_id, type, total_marks, marks_obtained, status)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const params = [enrollment_id, type, total_marks, marks_obtained, status];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllMarkingComponents = () => {
        return this.db.run(
            'get_all_marking_components',
            async () => {
                const query = `SELECT * FROM marking_components;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getMarkingComponentById = (id) => {
        return this.db.run(
            'get_marking_component_by_id',
            async () => {
                const query = `SELECT * FROM marking_components WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateMarkingComponent = (id, payload) => {
        return this.db.run(
            'update_marking_component',
            async () => {
                const { enrollment_id, type, total_marks, marks_obtained, status } = payload;
                const query = `
                    UPDATE marking_components
                    SET enrollment_id = $2, type = $3, total_marks = $4, marks_obtained = $5, status = $6
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, enrollment_id, type, total_marks, marks_obtained, status];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteMarkingComponent = (id) => {
        return this.db.run(
            'delete_marking_component',
            async () => {
                const query = `DELETE FROM marking_components WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getTeacherMarkingContexts = (teacherId) => {
        return this.db.run('get_teacher_marking_contexts', async () => {
            const query = `
                SELECT
                    te.course_offering_id,
                    te.section_name,
                    co.term_id,
                    t.term_number,
                    c.id AS course_id,
                    c.course_code,
                    c.name AS course_name,
                    c.credit_hours,
                    d.id AS department_id,
                    d.code AS department_code,
                    d.name AS department_name
                FROM teaches te
                JOIN course_offerings co ON co.id = te.course_offering_id
                JOIN terms t ON t.id = co.term_id
                JOIN courses c ON c.id = co.course_id
                LEFT JOIN departments d ON d.id = t.department_id
                WHERE te.teacher_id = $1
                  AND COALESCE(co.is_active, TRUE) = TRUE
                ORDER BY t.term_number DESC, d.code, c.course_code, te.section_name;
            `;

            const result = await this.db.query_executor(query, [teacherId]);
            return result.rows;
        });
    }

    getPublishedComponentsByEnrollmentIds = (enrollmentIds = []) => {
        return this.db.run('get_published_components_by_enrollment_ids', async () => {
            if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
                return [];
            }

            const normalizedIds = enrollmentIds
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0);

            if (normalizedIds.length === 0) {
                return [];
            }

            const query = `
                SELECT
                    mc.id,
                    mc.enrollment_id,
                    mc.type,
                    mc.total_marks,
                    mc.marks_obtained,
                    mc.status
                FROM marking_components mc
                WHERE mc.enrollment_id = ANY($1::INT[])
                  AND mc.status = 'Published'
                ORDER BY mc.enrollment_id ASC, mc.id ASC;
            `;

            const result = await this.db.query_executor(query, [normalizedIds]);
            return result.rows;
        });
    }

    getTeacherMarkingWorkspace = ({ teacherId, courseOfferingId, sectionName }) => {
        return this.db.run('get_teacher_marking_workspace', async () => {
            const contextQuery = `
                SELECT
                    te.course_offering_id,
                    te.section_name,
                    co.term_id,
                    t.term_number,
                    c.id AS course_id,
                    c.course_code,
                    c.name AS course_name,
                    c.credit_hours,
                    d.id AS department_id,
                    d.code AS department_code,
                    d.name AS department_name
                FROM teaches te
                JOIN course_offerings co ON co.id = te.course_offering_id
                JOIN terms t ON t.id = co.term_id
                JOIN courses c ON c.id = co.course_id
                LEFT JOIN departments d ON d.id = t.department_id
                WHERE te.teacher_id = $1
                  AND te.course_offering_id = $2
                  AND te.section_name = $3
                LIMIT 1;
            `;

            const contextResult = await this.db.query_executor(contextQuery, [teacherId, courseOfferingId, sectionName]);
            const contextRow = contextResult.rows[0];

            if (!contextRow) {
                const error = new Error('You are not assigned to this course offering and section.');
                error.status = 403;
                throw error;
            }

            const studentQuery = `
                SELECT
                    se.id AS enrollment_id,
                    se.student_id,
                    s.roll_number,
                    u.name AS student_name,
                    u.email AS student_email,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', mc.id,
                                'type', mc.type,
                                'total_marks', mc.total_marks,
                                'marks_obtained', mc.marks_obtained,
                                'status', mc.status
                            )
                            ORDER BY mc.id
                        ) FILTER (WHERE mc.id IS NOT NULL),
                        '[]'::json
                    ) AS marking_components
                FROM student_enrollments se
                JOIN students s ON s.user_id = se.student_id
                JOIN users u ON u.id = s.user_id
                JOIN student_sections ss
                    ON ss.student_id = se.student_id
                   AND ss.section_name = $2
                LEFT JOIN marking_components mc ON mc.enrollment_id = se.id
                WHERE se.course_offering_id = $1
                  AND se.status = 'Enrolled'
                GROUP BY se.id, se.student_id, s.roll_number, u.name, u.email
                ORDER BY s.roll_number;
            `;

            const studentResult = await this.db.query_executor(studentQuery, [courseOfferingId, sectionName]);
            const creditHours = Number(contextRow.credit_hours || 0);
            const creditCount = Math.max(1, Math.ceil(creditHours));

            return {
                context: contextRow,
                policies: {
                    max_marks: TYPE_MAX_TOTAL,
                    ct_credit_count: creditCount,
                    ct_max_components: creditCount + 1,
                    ct_best_count: creditCount,
                },
                students: studentResult.rows,
            };
        });
    }

    processTeacherMarkingBatch = ({
        teacherId,
        courseOfferingId,
        sectionName,
        markType,
        totalMarks,
        status,
        rows,
        dryRun = false,
    }) => {
        return this.db.run('process_teacher_marking_batch', async () => {
            const normalizedType = normalizeMarkType(markType);
            if (!normalizedType || !ALLOWED_MARK_TYPES.has(normalizedType)) {
                const error = new Error('mark_type must be one of CT, Midterm, Attendance, Final.');
                error.status = 400;
                throw error;
            }

            const normalizedStatus = normalizeMarkingStatus(status);
            if (!normalizedStatus || !ALLOWED_MARKING_STATUS.has(normalizedStatus)) {
                const error = new Error('status must be Published or Draft.');
                error.status = 400;
                throw error;
            }

            const normalizedTotalMarks = toPositiveNumber(totalMarks);
            if (!normalizedTotalMarks) {
                const error = new Error('total_marks must be greater than zero.');
                error.status = 400;
                throw error;
            }

            const maxTotalForType = TYPE_MAX_TOTAL[normalizedType];
            if (normalizedTotalMarks > maxTotalForType) {
                const error = new Error(`${normalizedType} total_marks cannot exceed ${maxTotalForType}.`);
                error.status = 400;
                throw error;
            }

            if (!Array.isArray(rows) || rows.length === 0) {
                const error = new Error('rows must be a non-empty array.');
                error.status = 400;
                throw error;
            }

            const workspace = await this.getTeacherMarkingWorkspace({
                teacherId,
                courseOfferingId,
                sectionName,
            });

            const allowedEnrollments = new Map(
                (workspace.students || []).map((student) => [Number(student.enrollment_id), student])
            );

            const ctMaxComponents = Number(workspace?.policies?.ct_max_components || 2);
            const ctCountByEnrollment = new Map();
            for (const student of workspace.students || []) {
                const components = Array.isArray(student.marking_components) ? student.marking_components : [];
                const ctCount = components.filter((c) => c?.type === 'CT').length;
                ctCountByEnrollment.set(Number(student.enrollment_id), ctCount);
            }

            const client = this.db.pool ? await this.db.pool.connect() : null;
            const rowResults = [];
            let insertedCount = 0;
            let updatedCount = 0;
            let failedCount = 0;

            try {
                if (client && !dryRun) {
                    await client.query('BEGIN');
                }

                for (let idx = 0; idx < rows.length; idx += 1) {
                    const row = rows[idx] || {};
                    const rowNumber = idx + 1;
                    const enrollmentId = Number(row.enrollment_id);
                    const marksObtained = toNonNegativeNumber(row.marks_obtained);
                    const rowTotalMarks = row.total_marks !== undefined && row.total_marks !== null && row.total_marks !== ''
                        ? toPositiveNumber(row.total_marks)
                        : normalizedTotalMarks;
                    const rowStatus = row.status ? normalizeMarkingStatus(row.status) : normalizedStatus;
                    const componentId = row.component_id ? Number(row.component_id) : null;

                    const fail = (reason) => {
                        failedCount += 1;
                        rowResults.push({ row: rowNumber, enrollment_id: row.enrollment_id || null, status: 'failed', reason });
                    };

                    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
                        fail('enrollment_id must be a positive integer.');
                        continue;
                    }

                    if (!allowedEnrollments.has(enrollmentId)) {
                        fail('enrollment_id is not under your selected course offering and section.');
                        continue;
                    }

                    if (marksObtained === null) {
                        fail('marks_obtained must be a non-negative number.');
                        continue;
                    }

                    if (!rowTotalMarks) {
                        fail('total_marks must be greater than zero.');
                        continue;
                    }

                    if (rowTotalMarks > maxTotalForType) {
                        fail(`total_marks for ${normalizedType} cannot exceed ${maxTotalForType}.`);
                        continue;
                    }

                    if (marksObtained > rowTotalMarks) {
                        fail('marks_obtained cannot exceed total_marks.');
                        continue;
                    }

                    if (!rowStatus || !ALLOWED_MARKING_STATUS.has(rowStatus)) {
                        fail('status must be Published or Draft.');
                        continue;
                    }

                    if (normalizedType === 'CT' && !componentId) {
                        const existingCtCount = Number(ctCountByEnrollment.get(enrollmentId) || 0);
                        if (existingCtCount >= ctMaxComponents) {
                            fail(`CT limit exceeded for enrollment ${enrollmentId}. Max allowed is ${ctMaxComponents}.`);
                            continue;
                        }
                    }

                    if (dryRun) {
                        rowResults.push({
                            row: rowNumber,
                            enrollment_id: enrollmentId,
                            status: 'validated',
                        });
                        continue;
                    }

                    try {
                        if (client) {
                            await client.query(`SAVEPOINT marking_row_${rowNumber}`);
                        }

                        let writeResult = null;
                        let operation = 'inserted';

                        if (componentId && Number.isInteger(componentId) && componentId > 0) {
                            const updateQuery = `
                                UPDATE marking_components
                                SET total_marks = $3, marks_obtained = $4, status = $5
                                WHERE id = $1
                                  AND enrollment_id = $2
                                  AND type = $6
                                RETURNING *;
                            `;
                            const updated = client
                                ? await client.query(updateQuery, [componentId, enrollmentId, rowTotalMarks, marksObtained, rowStatus, normalizedType])
                                : await this.db.query_executor(updateQuery, [componentId, enrollmentId, rowTotalMarks, marksObtained, rowStatus, normalizedType]);

                            if (updated.rows.length === 0) {
                                throw new Error('component_id does not match the selected enrollment/type.');
                            }

                            writeResult = updated.rows[0];
                            operation = 'updated';
                        } else if (normalizedType !== 'CT') {
                            const existingQuery = `
                                SELECT id
                                FROM marking_components
                                WHERE enrollment_id = $1
                                  AND type = $2
                                ORDER BY id DESC
                                LIMIT 1;
                            `;
                            const existing = client
                                ? await client.query(existingQuery, [enrollmentId, normalizedType])
                                : await this.db.query_executor(existingQuery, [enrollmentId, normalizedType]);

                            if (existing.rows.length > 0) {
                                const latestId = Number(existing.rows[0].id);
                                const updateQuery = `
                                    UPDATE marking_components
                                    SET total_marks = $2, marks_obtained = $3, status = $4
                                    WHERE id = $1
                                    RETURNING *;
                                `;
                                const updated = client
                                    ? await client.query(updateQuery, [latestId, rowTotalMarks, marksObtained, rowStatus])
                                    : await this.db.query_executor(updateQuery, [latestId, rowTotalMarks, marksObtained, rowStatus]);
                                writeResult = updated.rows[0];
                                operation = 'updated';
                            }
                        }

                        if (!writeResult) {
                            const insertQuery = `
                                INSERT INTO marking_components (enrollment_id, type, total_marks, marks_obtained, status)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING *;
                            `;
                            const inserted = client
                                ? await client.query(insertQuery, [enrollmentId, normalizedType, rowTotalMarks, marksObtained, rowStatus])
                                : await this.db.query_executor(insertQuery, [enrollmentId, normalizedType, rowTotalMarks, marksObtained, rowStatus]);
                            writeResult = inserted.rows[0];
                            operation = 'inserted';

                            if (normalizedType === 'CT') {
                                ctCountByEnrollment.set(enrollmentId, Number(ctCountByEnrollment.get(enrollmentId) || 0) + 1);
                            }
                        }

                        if (operation === 'inserted') insertedCount += 1;
                        if (operation === 'updated') updatedCount += 1;

                        rowResults.push({
                            row: rowNumber,
                            enrollment_id: enrollmentId,
                            status: operation,
                            component_id: writeResult.id,
                        });
                    } catch (rowError) {
                        if (client) {
                            await client.query(`ROLLBACK TO SAVEPOINT marking_row_${rowNumber}`);
                        }
                        failedCount += 1;
                        rowResults.push({
                            row: rowNumber,
                            enrollment_id: enrollmentId,
                            status: 'failed',
                            reason: rowError.message,
                        });
                    }
                }

                if (client && !dryRun) {
                    await client.query('COMMIT');
                }

                return {
                    dry_run: Boolean(dryRun),
                    mark_type: normalizedType,
                    total_rows: rows.length,
                    inserted_count: insertedCount,
                    updated_count: updatedCount,
                    failed_count: failedCount,
                    results: rowResults,
                };
            } catch (error) {
                if (client && !dryRun) {
                    await client.query('ROLLBACK');
                }
                throw error;
            } finally {
                if (client) client.release();
            }
        });
    }
}

module.exports = MarkingModel;
