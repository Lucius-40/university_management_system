const DB_Connection = require("../database/db.js");

const PASSING_GRADES = new Set(['A+', 'A', 'A-', 'B', 'C', 'D']);
const TERMINAL_TERM_NUMBER = 8;

const toDateOnly = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
};

class SystemStateModel {
    constructor() {
        this.db = DB_Connection.getInstance();
        this.sessionEndSchemaReady = false;
    }

    ensureSessionEndSchema = async (client = null) => {
        if (this.sessionEndSchemaReady) {
            return;
        }

        const runQuery = async (query, params = []) => {
            if (client) {
                return client.query(query, params);
            }
            return this.db.query_executor(query, params);
        };

        await runQuery(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_status'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_status VARCHAR(20) NOT NULL DEFAULT 'idle';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_started_at'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_started_at TIMESTAMPTZ;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_completed_at'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_completed_at TIMESTAMPTZ;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_started_by'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_started_by INT REFERENCES users(id);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_error'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_error TEXT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'session_end_summary'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN session_end_summary JSONB;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'last_ended_term_start'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN last_ended_term_start DATE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'last_ended_term_end'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN last_ended_term_end DATE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'current_state' AND column_name = 'last_ended_next_term_start'
                ) THEN
                    ALTER TABLE current_state
                    ADD COLUMN last_ended_next_term_start DATE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'current_state_session_end_status_chk'
                ) THEN
                    ALTER TABLE current_state
                    ADD CONSTRAINT current_state_session_end_status_chk
                    CHECK (session_end_status IN ('idle', 'running', 'completed', 'failed'));
                END IF;
            END $$;
        `);

        await runQuery(`
            CREATE OR REPLACE FUNCTION sync_terms_from_current_state()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS $$
            BEGIN
                -- Keep this trigger metadata-focused.
                -- Term date synchronization is handled explicitly from application logic.
                IF TG_OP = 'INSERT' AND NEW.newest_term_start IS NULL THEN
                    NEW.newest_term_start := NEW.term_start;
                END IF;

                NEW.updated_at := CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;
        `);

        this.sessionEndSchemaReady = true;
    }

    getCurrentState = () => {
        return this.db.run("get_current_state", async () => {
            await this.ensureSessionEndSchema();
            const query = `
                SELECT
                    id,
                    reg_start,
                    reg_end,
                    term_start,
                    term_end,
                    newest_term_start,
                    session_end_status,
                    session_end_started_at,
                    session_end_completed_at,
                    session_end_started_by,
                    session_end_error,
                    session_end_summary,
                    last_ended_term_start,
                    last_ended_term_end,
                    last_ended_next_term_start,
                    updated_at,
                    updated_by
                FROM current_state
                WHERE id = 1
                LIMIT 1;
            `;
            const result = await this.db.query_executor(query);
            return result.rows[0] || null;
        });
    }

    getStateHistory = (limit = 20) => {
        return this.db.run("get_state_history", async () => {
            const query = `
                SELECT
                    csh.id,
                    csh.changed_at,
                    csh.changed_by,
                    u.name AS changed_by_name,
                    csh.old_reg_start,
                    csh.new_reg_start,
                    csh.old_reg_end,
                    csh.new_reg_end,
                    csh.old_term_start,
                    csh.new_term_start,
                    csh.old_term_end,
                    csh.new_term_end,
                    csh.old_newest_term_start,
                    csh.new_newest_term_start,
                    csh.reason
                FROM current_state_history csh
                LEFT JOIN users u ON u.id = csh.changed_by
                ORDER BY csh.changed_at DESC
                LIMIT $1;
            `;
            const result = await this.db.query_executor(query, [limit]);
            return result.rows;
        });
    }

    getUniversitySummary = () => {
        return this.db.run("get_university_summary", async () => {
            const query = `
                SELECT
                    (SELECT COUNT(*) FROM departments) AS department_count,
                    (SELECT COUNT(*) FROM terms) AS term_count,
                    (SELECT COUNT(*) FROM courses) AS course_count,
                    (SELECT COUNT(*) FROM sections) AS section_count,
                    (SELECT COUNT(*) FROM students) AS student_count,
                    (SELECT COUNT(*) FROM teachers) AS teacher_count;
            `;
            const result = await this.db.query_executor(query);
            return result.rows[0];
        });
    }

    getDuplicateTermNumberGroups = () => {
        return this.db.run("get_duplicate_term_groups", async () => {
            const query = `
                SELECT department_id, term_number, COUNT(*) AS row_count
                FROM terms
                GROUP BY department_id, term_number
                HAVING COUNT(*) > 1
                ORDER BY department_id, term_number;
            `;
            const result = await this.db.query_executor(query);
            return result.rows;
        });
    }

    seedMissingTermsForDepartments = (term_start, term_end) => {
        return this.db.run("seed_missing_terms", async () => {
            const query = `
                INSERT INTO terms (term_number, start_date, end_date, department_id)
                SELECT
                    series.term_number,
                    $1::date AS start_date,
                    $2::date AS end_date,
                    d.id AS department_id
                FROM departments d
                CROSS JOIN generate_series(1, 8) AS series(term_number)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM terms t
                    WHERE t.department_id = d.id
                      AND t.term_number = series.term_number
                )
                RETURNING id;
            `;
            const result = await this.db.query_executor(query, [term_start, term_end]);
            return result.rowCount || 0;
        });
    }

    syncAllTermDateWindow = (term_start, term_end) => {
        return this.db.run('sync_all_term_date_window', async () => {
            await this.ensureSessionEndSchema();
            const query = `
                UPDATE terms
                SET
                    start_date = $1::date,
                    end_date = $2::date
                RETURNING id;
            `;

            const result = await this.db.query_executor(query, [term_start, term_end]);
            return result.rowCount || 0;
        });
    }

    previewEndCurrentSessionImpact = () => {
        return this.db.run('preview_end_current_session_impact', async () => {
            await this.ensureSessionEndSchema();

            const stateResult = await this.db.query_executor(
                `
                    SELECT
                        id,
                        term_start,
                        term_end,
                        session_end_status,
                        session_end_summary,
                        last_ended_term_start,
                        last_ended_term_end
                    FROM current_state
                    WHERE id = 1
                    LIMIT 1;
                `
            );

            if (stateResult.rows.length === 0) {
                const error = new Error('Current state is not configured.');
                error.statusCode = 400;
                throw error;
            }

            const state = stateResult.rows[0];
            const sessionStart = toDateOnly(state.term_start);
            const sessionEnd = toDateOnly(state.term_end);

            if (!sessionStart || !sessionEnd) {
                const error = new Error('term_start and term_end must be configured before ending session.');
                error.statusCode = 400;
                throw error;
            }

            if (String(state.session_end_status || '').toLowerCase() === 'running') {
                return {
                    message: 'Session-end impact preview generated.',
                    can_execute: false,
                    blocking_reason: 'A session end operation is already running.',
                    session_window: {
                        term_start: sessionStart,
                        term_end: sessionEnd,
                    },
                    summary: {
                        terms_processed: 0,
                        students_considered: 0,
                        students_eligible_for_next_term: 0,
                        students_will_graduate: 0,
                        students_not_eligible: 0,
                        pending_to_auto_approve: 0,
                        enrollments_to_archive: 0,
                        enrollments_missing_grade_to_f: 0,
                    },
                    terms_processed: [],
                    eligible_next_term_targets: [],
                    ineligible_reason_breakdown: [],
                };
            }

            const lastEndedStart = toDateOnly(state.last_ended_term_start);
            const lastEndedEnd = toDateOnly(state.last_ended_term_end);
            if (
                String(state.session_end_status || '').toLowerCase() === 'completed'
                && lastEndedStart === sessionStart
                && lastEndedEnd
                && sessionEnd
                && sessionEnd <= lastEndedEnd
            ) {
                const previousSummary = state.session_end_summary || {};
                return {
                    message: 'Session-end impact preview generated.',
                    can_execute: false,
                    blocking_reason: 'This session window is already ended.',
                    session_window: {
                        term_start: sessionStart,
                        term_end: sessionEnd,
                    },
                    summary: {
                        terms_processed: Number(previousSummary.terms_processed || 0),
                        students_considered: Number(previousSummary.students_considered || 0),
                        students_eligible_for_next_term: Number(previousSummary.promoted_count || 0),
                        students_will_graduate: Number(previousSummary.graduated_count || 0),
                        students_not_eligible: Number(
                            (previousSummary.failed_count || 0) + (previousSummary.skipped_count || 0)
                        ),
                        pending_to_auto_approve: Number(previousSummary.pending_auto_approved || 0),
                        enrollments_to_archive: Number(previousSummary.archived_enrollments || 0),
                        enrollments_missing_grade_to_f: Number(previousSummary.missing_marks_marked_as_f || 0),
                    },
                    terms_processed: [],
                    eligible_next_term_targets: [],
                    ineligible_reason_breakdown: [],
                };
            }

            const targetTermsResult = await this.db.query_executor(
                `
                    SELECT id, department_id, term_number, start_date, end_date
                    FROM terms
                    WHERE start_date = $1::date
                      AND end_date = $2::date
                    ORDER BY department_id, term_number, id;
                `,
                [sessionStart, sessionEnd]
            );

            const targetTerms = targetTermsResult.rows;
            if (targetTerms.length === 0) {
                return {
                    message: 'Session-end impact preview generated.',
                    can_execute: false,
                    blocking_reason: 'No terms found that match current session start/end dates.',
                    session_window: {
                        term_start: sessionStart,
                        term_end: sessionEnd,
                    },
                    summary: {
                        terms_processed: 0,
                        students_considered: 0,
                        students_eligible_for_next_term: 0,
                        students_will_graduate: 0,
                        students_not_eligible: 0,
                        pending_to_auto_approve: 0,
                        enrollments_to_archive: 0,
                        enrollments_missing_grade_to_f: 0,
                    },
                    terms_processed: [],
                    eligible_next_term_targets: [],
                    ineligible_reason_breakdown: [],
                };
            }

            const targetTermIds = targetTerms
                .map((term) => Number(term.id))
                .filter((termId) => Number.isInteger(termId));
            const targetTermIdSet = new Set(targetTermIds);

            const pendingCountResult = await this.db.query_executor(
                `
                    SELECT COUNT(*)::int AS total
                    FROM student_enrollments se
                    JOIN course_offerings co ON co.id = se.course_offering_id
                    WHERE co.term_id = ANY($1::int[])
                      AND se.status = 'Pending';
                `,
                [targetTermIds]
            );

            const enrollmentsInWindowResult = await this.db.query_executor(
                `
                    SELECT
                        se.id AS enrollment_id,
                        se.student_id,
                        co.term_id,
                        COALESCE(csr.grade, se.grade, 'F') AS effective_grade,
                        CASE
                            WHEN COALESCE(csr.grade, se.grade) IS NULL THEN TRUE
                            ELSE FALSE
                        END AS will_be_default_f
                    FROM student_enrollments se
                    JOIN course_offerings co ON co.id = se.course_offering_id
                    LEFT JOIN LATERAL (
                        SELECT csr_inner.grade
                        FROM compile_student_term_result(se.student_id, co.term_id) csr_inner
                        WHERE csr_inner.enrollment_id = se.id
                        LIMIT 1
                    ) csr ON TRUE
                    WHERE co.term_id = ANY($1::int[])
                      AND se.status IN ('Enrolled', 'Pending');
                `,
                [targetTermIds]
            );

            const candidateStudentIds = Array.from(new Set(
                enrollmentsInWindowResult.rows
                    .map((row) => Number(row.student_id))
                    .filter((studentId) => Number.isInteger(studentId))
            ));

            const allTermsResult = await this.db.query_executor(
                `
                    SELECT id, department_id, term_number, start_date
                    FROM terms
                    ORDER BY department_id, term_number, start_date DESC, id DESC;
                `
            );

            const latestTermByDepartmentAndNumber = new Map();
            for (const term of allTermsResult.rows) {
                const key = `${Number(term.department_id)}:${Number(term.term_number)}`;
                if (!latestTermByDepartmentAndNumber.has(key)) {
                    latestTermByDepartmentAndNumber.set(key, {
                        id: Number(term.id),
                        start_date: toDateOnly(term.start_date),
                    });
                }
            }

            const outcomes = [];
            const nextTermDistribution = new Map();
            const ineligibleReasonCount = new Map();

            if (candidateStudentIds.length > 0) {
                const studentContextResult = await this.db.query_executor(
                    `
                        SELECT
                            s.user_id AS student_id,
                            s.current_term,
                            t.department_id,
                            t.term_number
                        FROM students s
                        LEFT JOIN terms t ON t.id = s.current_term
                        WHERE s.user_id = ANY($1::int[])
                        ORDER BY s.user_id;
                    `,
                    [candidateStudentIds]
                );

                const byStudentTerm = new Map();
                for (const row of enrollmentsInWindowResult.rows) {
                    const studentId = Number(row.student_id);
                    const termId = Number(row.term_id);
                    if (!Number.isInteger(studentId) || !Number.isInteger(termId)) {
                        continue;
                    }

                    const key = `${studentId}:${termId}`;
                    const item = byStudentTerm.get(key) || { total_courses: 0, passed_courses: 0 };
                    item.total_courses += 1;
                    if (PASSING_GRADES.has(String(row.effective_grade || '').trim())) {
                        item.passed_courses += 1;
                    }
                    byStudentTerm.set(key, item);
                }

                for (const student of studentContextResult.rows) {
                    const studentId = Number(student.student_id);
                    const currentTermId = Number(student.current_term);
                    const departmentId = Number(student.department_id);
                    const termNumber = Number(student.term_number);

                    if (!Number.isInteger(currentTermId) || !targetTermIdSet.has(currentTermId)) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'skipped',
                            reason: 'student_current_term_not_in_ended_window',
                            from_term_id: Number.isInteger(currentTermId) ? currentTermId : null,
                            to_term_id: null,
                        });
                        ineligibleReasonCount.set(
                            'student_current_term_not_in_ended_window',
                            (ineligibleReasonCount.get('student_current_term_not_in_ended_window') || 0) + 1
                        );
                        continue;
                    }

                    const statKey = `${studentId}:${currentTermId}`;
                    const stats = byStudentTerm.get(statKey) || { total_courses: 0, passed_courses: 0 };
                    const totalCourses = Number(stats.total_courses || 0);
                    const passedCourses = Number(stats.passed_courses || 0);

                    if (totalCourses <= 0) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'failed',
                            reason: 'no_enrolled_courses',
                            from_term_id: currentTermId,
                            to_term_id: null,
                        });
                        ineligibleReasonCount.set(
                            'no_enrolled_courses',
                            (ineligibleReasonCount.get('no_enrolled_courses') || 0) + 1
                        );
                        continue;
                    }

                    if (passedCourses < totalCourses) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'failed',
                            reason: 'one_or_more_courses_not_passed',
                            from_term_id: currentTermId,
                            to_term_id: null,
                        });
                        ineligibleReasonCount.set(
                            'one_or_more_courses_not_passed',
                            (ineligibleReasonCount.get('one_or_more_courses_not_passed') || 0) + 1
                        );
                        continue;
                    }

                    if (!Number.isInteger(termNumber)) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'skipped',
                            reason: 'current_term_number_missing',
                            from_term_id: currentTermId,
                            to_term_id: null,
                        });
                        ineligibleReasonCount.set(
                            'current_term_number_missing',
                            (ineligibleReasonCount.get('current_term_number_missing') || 0) + 1
                        );
                        continue;
                    }

                    if (termNumber >= TERMINAL_TERM_NUMBER) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'graduated',
                            reason: 'terminal_term_passed',
                            from_term_id: currentTermId,
                            to_term_id: null,
                        });
                        continue;
                    }

                    const nextTermKey = `${departmentId}:${termNumber + 1}`;
                    const nextTerm = latestTermByDepartmentAndNumber.get(nextTermKey);
                    if (!nextTerm || !Number.isInteger(nextTerm.id)) {
                        outcomes.push({
                            student_id: studentId,
                            outcome: 'skipped',
                            reason: 'next_term_not_found',
                            from_term_id: currentTermId,
                            to_term_id: null,
                        });
                        ineligibleReasonCount.set(
                            'next_term_not_found',
                            (ineligibleReasonCount.get('next_term_not_found') || 0) + 1
                        );
                        continue;
                    }

                    outcomes.push({
                        student_id: studentId,
                        outcome: 'promoted',
                        reason: 'all_courses_passed',
                        from_term_id: currentTermId,
                        to_term_id: Number(nextTerm.id),
                    });
                    nextTermDistribution.set(
                        Number(nextTerm.id),
                        (nextTermDistribution.get(Number(nextTerm.id)) || 0) + 1
                    );
                }
            }

            const summary = {
                terms_processed: targetTermIds.length,
                students_considered: outcomes.length,
                students_eligible_for_next_term: outcomes.filter((item) => item.outcome === 'promoted').length,
                students_will_graduate: outcomes.filter((item) => item.outcome === 'graduated').length,
                students_not_eligible: outcomes.filter(
                    (item) => item.outcome === 'failed' || item.outcome === 'skipped'
                ).length,
                pending_to_auto_approve: Number(pendingCountResult.rows[0]?.total || 0),
                enrollments_to_archive: enrollmentsInWindowResult.rows.length,
                enrollments_missing_grade_to_f: enrollmentsInWindowResult.rows.filter(
                    (row) => Boolean(row.will_be_default_f)
                ).length,
            };

            return {
                message: 'Session-end impact preview generated.',
                can_execute: true,
                blocking_reason: null,
                session_window: {
                    term_start: sessionStart,
                    term_end: sessionEnd,
                },
                summary,
                terms_processed: targetTerms.map((term) => ({
                    id: Number(term.id),
                    department_id: Number(term.department_id),
                    term_number: Number(term.term_number),
                })),
                eligible_next_term_targets: Array.from(nextTermDistribution.entries()).map(([termId, count]) => ({
                    term_id: Number(termId),
                    student_count: Number(count),
                })),
                ineligible_reason_breakdown: Array.from(ineligibleReasonCount.entries()).map(([reason, count]) => ({
                    reason,
                    student_count: Number(count),
                })),
            };
        });
    }

    endCurrentSessionAndPromote = ({ triggeredByUserId, reason = null }) => {
        return this.db.run('end_current_session_and_promote', async () => {
            const client = await this.db.pool.connect();

            const markFailedState = async (message) => {
                try {
                    await this.db.query_executor(
                        `
                            UPDATE current_state
                            SET
                                session_end_status = 'failed',
                                session_end_completed_at = NOW(),
                                session_end_error = $2,
                                session_end_summary = NULL,
                                updated_by = $3
                            WHERE id = $1;
                        `,
                        [1, String(message || 'Unknown session end error'), triggeredByUserId || null]
                    );
                } catch (updateError) {
                    console.error('Failed to write failed session_end_status:', updateError.message);
                }
            };

            try {
                await this.ensureSessionEndSchema(client);
                await client.query('BEGIN');

                const stateResult = await client.query(
                    `
                        SELECT
                            id,
                            reg_start,
                            reg_end,
                            term_start,
                            term_end,
                            newest_term_start,
                            session_end_status,
                            last_ended_term_start,
                            last_ended_term_end
                        FROM current_state
                        WHERE id = 1
                        FOR UPDATE;
                    `
                );

                if (stateResult.rows.length === 0) {
                    const error = new Error('Current state is not configured.');
                    error.statusCode = 400;
                    error.skipFailureState = true;
                    throw error;
                }

                const state = stateResult.rows[0];
                const sessionStart = toDateOnly(state.term_start);
                const sessionEnd = toDateOnly(state.term_end);

                if (!sessionStart || !sessionEnd) {
                    const error = new Error('term_start and term_end must be configured before ending session.');
                    error.statusCode = 400;
                    error.skipFailureState = true;
                    throw error;
                }

                if (String(state.session_end_status || '').toLowerCase() === 'running') {
                    const error = new Error('A session end operation is already running.');
                    error.statusCode = 409;
                    error.skipFailureState = true;
                    throw error;
                }

                const lastEndedStart = toDateOnly(state.last_ended_term_start);
                const lastEndedEnd = toDateOnly(state.last_ended_term_end);
                if (
                    String(state.session_end_status || '').toLowerCase() === 'completed'
                    && lastEndedStart === sessionStart
                    && lastEndedEnd
                    && sessionEnd
                    && sessionEnd <= lastEndedEnd
                ) {
                    const error = new Error('This session window is already ended.');
                    error.statusCode = 409;
                    error.skipFailureState = true;
                    throw error;
                }

                await client.query(
                    `
                        UPDATE current_state
                        SET
                            session_end_status = 'running',
                            session_end_started_at = NOW(),
                            session_end_completed_at = NULL,
                            session_end_started_by = $2::int,
                            session_end_error = NULL,
                            session_end_summary = NULL,
                            updated_by = $2::int
                        WHERE id = $1;
                    `,
                    [1, triggeredByUserId || null]
                );

                const targetTermsResult = await client.query(
                    `
                        SELECT id, department_id, term_number, start_date, end_date
                        FROM terms
                        WHERE start_date = $1::date
                          AND end_date = $2::date
                        ORDER BY department_id, term_number, id;
                    `,
                    [sessionStart, sessionEnd]
                );

                const targetTerms = targetTermsResult.rows;
                if (targetTerms.length === 0) {
                    const error = new Error('No terms found that match current session start/end dates.');
                    error.statusCode = 409;
                    throw error;
                }

                const targetTermIds = targetTerms
                    .map((term) => Number(term.id))
                    .filter((termId) => Number.isInteger(termId));
                const targetTermIdSet = new Set(targetTermIds);

                const autoApproveResult = await client.query(
                    `
                        UPDATE student_enrollments se
                        SET
                            status = 'Enrolled'::enrollment_status_enum,
                            approved_timestamp = COALESCE(se.approved_timestamp, NOW())
                        FROM course_offerings co
                        WHERE co.id = se.course_offering_id
                          AND co.term_id = ANY($1::int[])
                          AND se.status = 'Pending'
                        RETURNING se.id;
                    `,
                    [targetTermIds]
                );

                await client.query(
                    `
                        SELECT refresh_enrollment_grade_from_markings(se.id)
                        FROM student_enrollments se
                        JOIN course_offerings co ON co.id = se.course_offering_id
                        WHERE co.term_id = ANY($1::int[])
                          AND se.status = 'Enrolled';
                    `,
                    [targetTermIds]
                );

                const missingMarksAsFResult = await client.query(
                    `
                        UPDATE student_enrollments se
                        SET grade = 'F'
                        FROM course_offerings co
                        WHERE co.id = se.course_offering_id
                          AND co.term_id = ANY($1::int[])
                          AND se.status = 'Enrolled'
                          AND se.grade IS NULL
                        RETURNING se.id;
                    `,
                    [targetTermIds]
                );

                const candidateStudentsResult = await client.query(
                    `
                        SELECT DISTINCT se.student_id
                        FROM student_enrollments se
                        JOIN course_offerings co ON co.id = se.course_offering_id
                        WHERE co.term_id = ANY($1::int[])
                          AND se.status = 'Enrolled';
                    `,
                    [targetTermIds]
                );

                const candidateStudentIds = candidateStudentsResult.rows
                    .map((row) => Number(row.student_id))
                    .filter((studentId) => Number.isInteger(studentId));

                const allTermsResult = await client.query(
                    `
                        SELECT id, department_id, term_number, start_date
                        FROM terms
                        ORDER BY department_id, term_number, start_date DESC, id DESC;
                    `
                );

                const latestTermByDepartmentAndNumber = new Map();
                for (const term of allTermsResult.rows) {
                    const key = `${Number(term.department_id)}:${Number(term.term_number)}`;
                    if (!latestTermByDepartmentAndNumber.has(key)) {
                        latestTermByDepartmentAndNumber.set(key, {
                            id: Number(term.id),
                            start_date: toDateOnly(term.start_date),
                        });
                    }
                }

                const outcomes = [];
                const promoteGroups = new Map();
                const graduateIds = [];
                const nextStartCandidates = [];

                if (candidateStudentIds.length > 0) {
                    const studentContextResult = await client.query(
                        `
                            SELECT
                                s.user_id AS student_id,
                                s.current_term,
                                s.status AS student_status,
                                t.department_id,
                                t.term_number
                            FROM students s
                            LEFT JOIN terms t ON t.id = s.current_term
                            WHERE s.user_id = ANY($1::int[])
                            ORDER BY s.user_id;
                        `,
                        [candidateStudentIds]
                    );

                    const enrollmentResult = await client.query(
                        `
                            SELECT
                                se.student_id,
                                co.term_id,
                                se.grade
                            FROM student_enrollments se
                            JOIN course_offerings co ON co.id = se.course_offering_id
                            WHERE se.student_id = ANY($1::int[])
                              AND co.term_id = ANY($2::int[])
                              AND se.status = 'Enrolled';
                        `,
                        [candidateStudentIds, targetTermIds]
                    );

                    const byStudentTerm = new Map();
                    for (const row of enrollmentResult.rows) {
                        const key = `${Number(row.student_id)}:${Number(row.term_id)}`;
                        const item = byStudentTerm.get(key) || { total_courses: 0, passed_courses: 0 };
                        item.total_courses += 1;
                        if (PASSING_GRADES.has(String(row.grade || '').trim())) {
                            item.passed_courses += 1;
                        }
                        byStudentTerm.set(key, item);
                    }

                    for (const student of studentContextResult.rows) {
                        const studentId = Number(student.student_id);
                        const currentTermId = Number(student.current_term);
                        const departmentId = Number(student.department_id);
                        const termNumber = Number(student.term_number);

                        if (!Number.isInteger(currentTermId) || !targetTermIdSet.has(currentTermId)) {
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'skipped',
                                reason: 'student_current_term_not_in_ended_window',
                                from_term_id: Number.isInteger(currentTermId) ? currentTermId : null,
                                to_term_id: null,
                            });
                            continue;
                        }

                        const statKey = `${studentId}:${currentTermId}`;
                        const stats = byStudentTerm.get(statKey) || { total_courses: 0, passed_courses: 0 };
                        const totalCourses = Number(stats.total_courses || 0);
                        const passedCourses = Number(stats.passed_courses || 0);

                        if (totalCourses <= 0) {
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'failed',
                                reason: 'no_enrolled_courses',
                                from_term_id: currentTermId,
                                to_term_id: null,
                            });
                            continue;
                        }

                        if (passedCourses < totalCourses) {
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'failed',
                                reason: 'one_or_more_courses_not_passed',
                                from_term_id: currentTermId,
                                to_term_id: null,
                            });
                            continue;
                        }

                        if (!Number.isInteger(termNumber)) {
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'skipped',
                                reason: 'current_term_number_missing',
                                from_term_id: currentTermId,
                                to_term_id: null,
                            });
                            continue;
                        }

                        if (termNumber >= TERMINAL_TERM_NUMBER) {
                            graduateIds.push(studentId);
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'graduated',
                                reason: 'terminal_term_passed',
                                from_term_id: currentTermId,
                                to_term_id: null,
                            });
                            continue;
                        }

                        const nextTermKey = `${departmentId}:${termNumber + 1}`;
                        const nextTerm = latestTermByDepartmentAndNumber.get(nextTermKey);
                        if (!nextTerm || !Number.isInteger(nextTerm.id)) {
                            outcomes.push({
                                student_id: studentId,
                                outcome: 'skipped',
                                reason: 'next_term_not_found',
                                from_term_id: currentTermId,
                                to_term_id: null,
                            });
                            continue;
                        }

                        if (nextTerm.start_date) {
                            nextStartCandidates.push(nextTerm.start_date);
                        }

                        const nextTermId = Number(nextTerm.id);
                        const group = promoteGroups.get(nextTermId) || [];
                        group.push(studentId);
                        promoteGroups.set(nextTermId, group);

                        outcomes.push({
                            student_id: studentId,
                            outcome: 'promoted',
                            reason: 'all_courses_passed',
                            from_term_id: currentTermId,
                            to_term_id: nextTermId,
                        });
                    }
                }

                for (const [nextTermId, ids] of promoteGroups.entries()) {
                    if (!ids.length) continue;
                    await client.query(
                        `
                            UPDATE students
                            SET current_term = $1
                            WHERE user_id = ANY($2::int[]);
                        `,
                        [nextTermId, ids]
                    );
                }

                if (graduateIds.length > 0) {
                    await client.query(
                        `
                            UPDATE students
                            SET status = 'Graduated'::student_status_enum
                            WHERE user_id = ANY($1::int[]);
                        `,
                        [graduateIds]
                    );
                }

                const archiveResult = await client.query(
                    `
                        UPDATE student_enrollments se
                        SET status = 'Archived'::enrollment_status_enum
                        FROM course_offerings co
                        WHERE co.id = se.course_offering_id
                          AND co.term_id = ANY($1::int[])
                          AND se.status = 'Enrolled'
                        RETURNING se.id;
                    `,
                    [targetTermIds]
                );

                const nowDate = toDateOnly(new Date());
                const termStartDate = toDateOnly(state.term_start);
                const regStartDate = toDateOnly(state.reg_start);

                const effectiveTermCloseDate = termStartDate && termStartDate > nowDate ? termStartDate : nowDate;
                const effectiveRegCloseDate = regStartDate && regStartDate > nowDate ? regStartDate : nowDate;

                const nextSessionStart = nextStartCandidates
                    .filter(Boolean)
                    .sort()[0] || toDateOnly(state.newest_term_start) || sessionStart;

                const summary = {
                    terms_processed: targetTermIds.length,
                    students_considered: outcomes.length,
                    pending_auto_approved: Number(autoApproveResult.rowCount || 0),
                    missing_marks_marked_as_f: Number(missingMarksAsFResult.rowCount || 0),
                    archived_enrollments: Number(archiveResult.rowCount || 0),
                    promoted_count: outcomes.filter((item) => item.outcome === 'promoted').length,
                    graduated_count: outcomes.filter((item) => item.outcome === 'graduated').length,
                    failed_count: outcomes.filter((item) => item.outcome === 'failed').length,
                    skipped_count: outcomes.filter((item) => item.outcome === 'skipped').length,
                };

                const finalStateResult = await client.query(
                    `
                        UPDATE current_state
                        SET
                            reg_end = $2::date,
                            term_end = $3::date,
                            newest_term_start = $4::date,
                            session_end_status = 'completed',
                            session_end_completed_at = NOW(),
                            session_end_error = NULL,
                            session_end_summary = $5::jsonb,
                            last_ended_term_start = $6::date,
                            last_ended_term_end = $7::date,
                            last_ended_next_term_start = $8::date,
                            updated_by = $9::int
                        WHERE id = $1
                        RETURNING
                            id,
                            reg_start,
                            reg_end,
                            term_start,
                            term_end,
                            newest_term_start,
                            session_end_status,
                            session_end_started_at,
                            session_end_completed_at,
                            session_end_started_by,
                            session_end_error,
                            session_end_summary,
                            last_ended_term_start,
                            last_ended_term_end,
                            last_ended_next_term_start,
                            updated_at,
                            updated_by;
                    `,
                    [
                        1,
                        effectiveRegCloseDate,
                        effectiveTermCloseDate,
                        nextSessionStart,
                        JSON.stringify(summary),
                        sessionStart,
                        sessionEnd,
                        nextSessionStart,
                        triggeredByUserId || null,
                    ]
                );

                await client.query('COMMIT');

                return {
                    message: 'Current session ended and progression completed successfully.',
                    session_window: {
                        term_start: sessionStart,
                        term_end: sessionEnd,
                    },
                    summary,
                    state: finalStateResult.rows[0] || null,
                    terms_processed: targetTerms.map((term) => ({
                        id: Number(term.id),
                        department_id: Number(term.department_id),
                        term_number: Number(term.term_number),
                    })),
                    student_outcomes: outcomes,
                };
            } catch (error) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Rollback failed while ending session:', rollbackError.message);
                }

                if (!error.skipFailureState) {
                    await markFailedState(error.message);
                }

                throw error;
            } finally {
                client.release();
            }
        });
    }

    upsertCurrentState = ({ reg_start, reg_end, term_start, term_end, updated_by }) => {
        return this.db.run("upsert_current_state", async () => {
            await this.ensureSessionEndSchema();
            const query = `
                INSERT INTO current_state (
                    id,
                    reg_start,
                    reg_end,
                    term_start,
                    term_end,
                    newest_term_start,
                    updated_by
                )
                VALUES (1, $1, $2, $3, $4, $3, $5)
                ON CONFLICT (id)
                DO UPDATE SET
                    reg_start = EXCLUDED.reg_start,
                    reg_end = EXCLUDED.reg_end,
                    term_start = EXCLUDED.term_start,
                    term_end = EXCLUDED.term_end,
                    newest_term_start = EXCLUDED.newest_term_start,
                    updated_by = EXCLUDED.updated_by
                RETURNING
                    id,
                    reg_start,
                    reg_end,
                    term_start,
                    term_end,
                    newest_term_start,
                    session_end_status,
                    session_end_started_at,
                    session_end_completed_at,
                    session_end_started_by,
                    session_end_error,
                    session_end_summary,
                    last_ended_term_start,
                    last_ended_term_end,
                    last_ended_next_term_start,
                    updated_at,
                    updated_by;
            `;

            const params = [reg_start, reg_end, term_start, term_end, updated_by];
            const result = await this.db.query_executor(query, params);
            return result.rows[0];
        });
    }
}

module.exports = SystemStateModel;
