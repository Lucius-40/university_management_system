const DB_Connection = require("../database/db.js");

const RULE_CANDIDATE_PREVIEW_QUERY = `
    WITH rule_base AS (
        SELECT
            dr.id AS rule_id,
            dr.name AS rule_name,
            dr.due_id,
            dr.frequency,
            dr.required_for_registration,
            dr.issue_offset_days,
            d.name AS due_name,
            d.amount AS due_amount
        FROM due_rules dr
        JOIN dues d ON d.id = dr.due_id
        WHERE dr.id = $1
          AND dr.is_active = TRUE
          AND COALESCE(d.is_active, TRUE) = TRUE
          AND (dr.starts_on IS NULL OR dr.starts_on <= CURRENT_DATE)
          AND (dr.ends_on IS NULL OR dr.ends_on >= CURRENT_DATE)
    ),
    scoped_candidates AS (
        SELECT DISTINCT
            s.user_id AS student_id,
            s.roll_number,
            t.id AS term_id,
            t.term_number,
            t.start_date AS term_start,
            t.department_id,
            ss.section_name
        FROM students s
        LEFT JOIN terms t ON t.id = s.current_term
        LEFT JOIN student_sections ss ON ss.student_id = s.user_id
        JOIN due_rule_scopes drs ON drs.rule_id = $1
        WHERE (drs.department_id IS NULL OR drs.department_id = t.department_id)
          AND (drs.term_number IS NULL OR drs.term_number = t.term_number)
          AND (drs.section_name IS NULL OR drs.section_name = ss.section_name)
          AND (
            drs.batch_year IS NULL
            OR drs.batch_year = CAST(NULLIF(SUBSTRING(s.roll_number FROM '^[0-9]{4}'), '') AS INT)
          )
    ),
    global_candidates AS (
        SELECT DISTINCT
            s.user_id AS student_id,
            s.roll_number,
            t.id AS term_id,
            t.term_number,
            t.start_date AS term_start,
            t.department_id,
            ss.section_name
        FROM students s
        LEFT JOIN terms t ON t.id = s.current_term
        LEFT JOIN student_sections ss ON ss.student_id = s.user_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM due_rule_scopes drs
            WHERE drs.rule_id = $1
        )
    ),
    candidates AS (
        SELECT * FROM scoped_candidates
        UNION
        SELECT * FROM global_candidates
    ),
    enriched AS (
        SELECT
            c.student_id,
            c.roll_number,
            c.term_id,
            c.term_number,
            c.term_start,
            c.department_id,
            dept.code AS department_code,
            dept.name AS department_name,
            c.section_name,
            (
                SELECT o.override_amount
                FROM due_rule_amount_overrides o
                WHERE o.rule_id = $1
                  AND (o.department_id IS NULL OR o.department_id = c.department_id)
                  AND (o.term_number IS NULL OR o.term_number = c.term_number)
                  AND (o.section_name IS NULL OR o.section_name = c.section_name)
                  AND (
                    o.batch_year IS NULL
                    OR o.batch_year = CAST(NULLIF(SUBSTRING(c.roll_number FROM '^[0-9]{4}'), '') AS INT)
                  )
                ORDER BY
                    (CASE WHEN o.department_id IS NULL THEN 0 ELSE 1 END
                     + CASE WHEN o.term_number IS NULL THEN 0 ELSE 1 END
                     + CASE WHEN o.section_name IS NULL THEN 0 ELSE 1 END
                     + CASE WHEN o.batch_year IS NULL THEN 0 ELSE 1 END) DESC,
                    o.id DESC
                LIMIT 1
            ) AS override_amount
        FROM candidates c
        LEFT JOIN departments dept ON dept.id = c.department_id
    )
    SELECT
        rb.rule_id,
        rb.rule_name,
        rb.due_id,
        rb.due_name,
        rb.due_amount,
        rb.frequency,
        rb.required_for_registration,
        e.student_id,
        e.roll_number,
        e.department_id,
        e.department_code,
        e.department_name,
        e.term_id,
        e.term_number,
        e.section_name,
        e.override_amount,
        COALESCE(e.override_amount, rb.due_amount) AS effective_amount,
        CASE
            WHEN e.term_start IS NOT NULL THEN (e.term_start - make_interval(days => GREATEST(rb.issue_offset_days, 0)))::date
            ELSE CURRENT_DATE
        END AS due_date,
        CASE rb.frequency
            WHEN 'one_time' THEN NOT EXISTS (
                SELECT 1
                FROM due_rule_issuance_log l
                WHERE l.rule_id = rb.rule_id
                  AND l.student_id = e.student_id
            )
            WHEN 'per_term' THEN NOT EXISTS (
                SELECT 1
                FROM due_rule_issuance_log l
                WHERE l.rule_id = rb.rule_id
                  AND l.student_id = e.student_id
                  AND COALESCE(l.term_id, -1) = COALESCE(e.term_id, -1)
            )
            WHEN 'per_year' THEN NOT EXISTS (
                SELECT 1
                FROM due_rule_issuance_log l
                LEFT JOIN terms lt ON lt.id = l.term_id
                WHERE l.rule_id = rb.rule_id
                  AND l.student_id = e.student_id
                  AND EXTRACT(YEAR FROM COALESCE(lt.start_date, l.created_at::date)) = EXTRACT(YEAR FROM COALESCE(e.term_start, CURRENT_DATE))
            )
            ELSE FALSE
        END AS can_issue
    FROM rule_base rb
    JOIN enriched e ON TRUE
    ORDER BY e.department_code NULLS LAST, e.term_number NULLS LAST, e.roll_number;
`;

const VALID_PAYMENT_METHODS = new Set(['Mobile Banking', 'Bank Transfer']);
const RULE_CANDIDATE_PREVIEW_QUERY_EMBEDDABLE = RULE_CANDIDATE_PREVIEW_QUERY.trim().replace(/;\s*$/, '');
const RULE_CANDIDATE_FAST_QUERY_EMBEDDABLE = RULE_CANDIDATE_PREVIEW_QUERY_EMBEDDABLE.replace(
    /ORDER BY e\.department_code NULLS LAST, e\.term_number NULLS LAST, e\.roll_number\s*$/,
    ''
);

class PaymentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createDue = (payload) => {
        return this.db.run(
            'create_due',
            async () => {
                const {
                    name,
                    amount,
                    bank_account_number,
                    is_active = true,
                    required_for_registration = true,
                    description = null,
                } = payload;
                const query = `
                    INSERT INTO dues (
                        name,
                        amount,
                        bank_account_number,
                        is_active,
                        required_for_registration,
                        description
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *;
                `;
                const params = [name, amount, bank_account_number, is_active, required_for_registration, description];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllDues = () => {
        return this.db.run(
            'get_all_dues',
            async () => {
                const query = `SELECT * FROM dues;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getDueById = (id) => {
        return this.db.run(
            'get_due_by_id',
            async () => {
                const query = `SELECT * FROM dues WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateDue = (id, payload) => {
        return this.db.run(
            'update_due',
            async () => {
                const { name, amount, bank_account_number, is_active, required_for_registration, description } = payload;
                const query = `
                    UPDATE dues
                    SET name = $2,
                        amount = $3,
                        bank_account_number = $4,
                        is_active = COALESCE($5, is_active),
                        required_for_registration = COALESCE($6, required_for_registration),
                        description = COALESCE($7, description)
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, name, amount, bank_account_number, is_active, required_for_registration, description];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteDue = (id) => {
        return this.db.run(
            'delete_due',
            async () => {
                const query = `DELETE FROM dues WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    createStudentDuesPayment = (payload) => {
        return this.db.run(
            'create_student_dues_payment',
            async () => {
                const {
                    student_id,
                    due_id,
                    amount_paid,
                    amount_due_override,
                    paid_at,
                    payment_method,
                    mobile_banking_number,
                    status,
                    deadline,
                    term_id,
                    issued_at,
                    due_date,
                    required_for_registration,
                    waived_at,
                    waive_reason,
                } = payload;
                const query = `
                    INSERT INTO student_dues_payment (
                        student_id,
                        due_id,
                        amount_paid,
                        amount_due_override,
                        paid_at,
                        payment_method,
                        mobile_banking_number,
                        status,
                        deadline,
                        term_id,
                        issued_at,
                        due_date,
                        required_for_registration,
                        waived_at,
                        waive_reason
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13, $14, $15)
                    RETURNING *;
                `;
                const params = [
                    student_id,
                    due_id,
                    amount_paid,
                    amount_due_override,
                    paid_at,
                    payment_method,
                    mobile_banking_number,
                    status,
                    deadline,
                    term_id,
                    issued_at,
                    due_date,
                    required_for_registration,
                    waived_at,
                    waive_reason,
                ];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getStudentDuesPayments = (student_id) => {
        return this.db.run(
            'get_student_dues_payments',
            async () => {
                const query = `
                    SELECT
                        sdp.*,
                        d.name AS due_name,
                        d.amount AS due_amount,
                        COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount
                    FROM student_dues_payment sdp
                    JOIN dues d ON d.id = sdp.due_id
                    WHERE sdp.student_id = $1
                    ORDER BY COALESCE(sdp.due_date, sdp.deadline) NULLS LAST, sdp.id DESC;
                `;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }

    createDueRule = (payload) => {
        return this.db.run('create_due_rule', async () => {
            const {
                name,
                due_id,
                frequency = 'per_year',
                is_active = true,
                required_for_registration = true,
                issue_offset_days = 7,
                starts_on = null,
                ends_on = null,
            } = payload;

            const query = `
                INSERT INTO due_rules (
                    name,
                    due_id,
                    frequency,
                    is_active,
                    required_for_registration,
                    issue_offset_days,
                    starts_on,
                    ends_on
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `;

            const params = [
                name,
                due_id,
                frequency,
                is_active,
                required_for_registration,
                issue_offset_days,
                starts_on,
                ends_on,
            ];
            const result = await this.db.query_executor(query, params);
            return result.rows[0];
        });
    }

    getAllDueRules = () => {
        return this.db.run('get_all_due_rules', async () => {
            const query = `
                SELECT
                    dr.*,
                    d.name AS due_name,
                    d.amount AS due_amount,
                    d.required_for_registration AS due_required_for_registration
                FROM due_rules dr
                JOIN dues d ON d.id = dr.due_id
                ORDER BY dr.id DESC;
            `;
            const result = await this.db.query_executor(query);
            return result.rows;
        });
    }

    getAllDueRuleScopes = () => {
        return this.db.run('get_all_due_rule_scopes', async () => {
            const query = `
                SELECT
                    drs.*,
                    dr.name AS rule_name,
                    dr.due_id,
                    d.name AS due_name,
                    dept.code AS department_code,
                    dept.name AS department_name
                FROM due_rule_scopes drs
                JOIN due_rules dr ON dr.id = drs.rule_id
                JOIN dues d ON d.id = dr.due_id
                LEFT JOIN departments dept ON dept.id = drs.department_id
                ORDER BY drs.rule_id DESC, drs.id DESC;
            `;

            const result = await this.db.query_executor(query);
            return result.rows;
        });
    }

    createDueRuleScope = (rule_id, payload) => {
        return this.db.run('create_due_rule_scope', async () => {
            const {
                department_id = null,
                term_number = null,
                section_name = null,
                batch_year = null,
            } = payload;

            const query = `
                INSERT INTO due_rule_scopes (rule_id, department_id, term_number, section_name, batch_year)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
            `;
            const params = [rule_id, department_id, term_number, section_name, batch_year];
            const result = await this.db.query_executor(query, params);
            return result.rows[0];
        });
    }

    createDueRuleAmountOverride = (rule_id, payload) => {
        return this.db.run('create_due_rule_amount_override', async () => {
            const {
                department_id = null,
                term_number = null,
                section_name = null,
                batch_year = null,
                override_amount,
            } = payload;

            const query = `
                INSERT INTO due_rule_amount_overrides (
                    rule_id,
                    department_id,
                    term_number,
                    section_name,
                    batch_year,
                    override_amount
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            const params = [rule_id, department_id, term_number, section_name, batch_year, override_amount];
            const result = await this.db.query_executor(query, params);
            return result.rows[0];
        });
    }

    previewDueRuleIssuance = (rule_id) => {
        return this.db.run('preview_due_rule_issuance', async () => {
            const result = await this.db.query_executor(RULE_CANDIDATE_PREVIEW_QUERY, [rule_id]);
            return result.rows;
        });
    }

    previewDueRuleIssuanceSnapshot = (rule_id) => {
        return this.db.run('preview_due_rule_issuance_snapshot', async () => {
            const summaryQuery = `
                WITH preview AS (
                    ${RULE_CANDIDATE_FAST_QUERY_EMBEDDABLE}
                )
                SELECT
                    COALESCE(COUNT(*), 0)::INT AS matched_count,
                    COALESCE(SUM(CASE WHEN can_issue THEN 1 ELSE 0 END), 0)::INT AS issuable_count
                FROM preview;
            `;

            const byDepartmentQuery = `
                WITH preview AS (
                    ${RULE_CANDIDATE_FAST_QUERY_EMBEDDABLE}
                )
                SELECT
                    COALESCE(department_code, 'N/A') AS department_code,
                    COALESCE(department_name, 'Unassigned') AS department_name,
                    COUNT(*)::INT AS matched_count,
                    SUM(CASE WHEN can_issue THEN 1 ELSE 0 END)::INT AS issuable_count
                FROM preview
                GROUP BY COALESCE(department_code, 'N/A'), COALESCE(department_name, 'Unassigned')
                ORDER BY department_code, department_name;
            `;

            const [summaryResult, departmentResult] = await Promise.all([
                this.db.query_executor(summaryQuery, [rule_id]),
                this.db.query_executor(byDepartmentQuery, [rule_id]),
            ]);

            const summary = summaryResult.rows[0] || { matched_count: 0, issuable_count: 0 };
            return {
                matched_count: Number(summary.matched_count || 0),
                issuable_count: Number(summary.issuable_count || 0),
                by_department: departmentResult.rows,
            };
        });
    }

    issueDueRuleNow = (rule_id, actorId = null) => {
        return this.db.run('issue_due_rule_now', async () => {
            const client = await this.db.pool.connect();

            try {
                await client.query('BEGIN');

                const note = actorId
                    ? `Issued from admin ${actorId}`
                    : 'Issued from admin action';

                const issueQuery = `
                    WITH preview AS (
                        ${RULE_CANDIDATE_FAST_QUERY_EMBEDDABLE}
                    ),
                    issuable AS (
                        SELECT *
                        FROM preview
                        WHERE can_issue = TRUE
                    ),
                    inserted_payments AS (
                        INSERT INTO student_dues_payment (
                            student_id,
                            due_id,
                            amount_paid,
                            amount_due_override,
                            status,
                            deadline,
                            term_id,
                            issued_at,
                            due_date,
                            required_for_registration
                        )
                        SELECT
                            i.student_id,
                            i.due_id,
                            0,
                            i.override_amount,
                            'Overdue',
                            i.due_date,
                            i.term_id,
                            CURRENT_TIMESTAMP,
                            i.due_date,
                            i.required_for_registration
                        FROM issuable i
                        RETURNING id, student_id, term_id
                    ),
                    inserted_logs AS (
                        INSERT INTO due_rule_issuance_log (
                            rule_id,
                            student_id,
                            term_id,
                            student_due_payment_id,
                            note
                        )
                        SELECT
                            $1,
                            ip.student_id,
                            ip.term_id,
                            ip.id,
                            $2
                        FROM inserted_payments ip
                        ON CONFLICT (rule_id, student_id, term_id) DO NOTHING
                        RETURNING 1
                    )
                    SELECT
                        (SELECT COUNT(*)::INT FROM preview) AS matched_count,
                        (SELECT COUNT(*)::INT FROM inserted_payments) AS issued_count;
                `;

                const issueResult = await client.query(issueQuery, [rule_id, note]);
                const matchedCount = Number(issueResult.rows[0]?.matched_count || 0);
                const issuedCount = Number(issueResult.rows[0]?.issued_count || 0);
                const skippedCount = Math.max(matchedCount - issuedCount, 0);

                await client.query('COMMIT');

                return {
                    rule_id: Number(rule_id),
                    issued_count: issuedCount,
                    skipped_count: skippedCount,
                    matched_count: matchedCount,
                };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        });
    }

    ensurePaymentRequestTable = async () => {
        const query = `
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_request_status_enum') THEN
                    CREATE TYPE payment_request_status_enum AS ENUM ('Recorded');
                END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS student_due_payment_requests (
                id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
                student_due_payment_id INT NOT NULL REFERENCES student_dues_payment(id) ON DELETE CASCADE,
                student_id INT NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
                requested_amount DECIMAL(10, 2) NOT NULL CHECK (requested_amount > 0),
                payment_method payment_method_enum NOT NULL,
                mobile_banking_number VARCHAR(20),
                note TEXT,
                status payment_request_status_enum NOT NULL DEFAULT 'Recorded',
                review_note TEXT,
                reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE student_due_payment_requests
            ALTER COLUMN status DROP DEFAULT;

            ALTER TABLE student_due_payment_requests
            DROP CONSTRAINT IF EXISTS student_due_payment_requests_status_check;

            ALTER TABLE student_due_payment_requests
            ALTER COLUMN status TYPE payment_request_status_enum
            USING (
                CASE
                    WHEN status::text IN ('Pending', 'Approved', 'Rejected', 'Recorded') THEN 'Recorded'::payment_request_status_enum
                    ELSE 'Recorded'::payment_request_status_enum
                END
            );

            ALTER TABLE student_due_payment_requests
            ALTER COLUMN status SET DEFAULT 'Recorded'::payment_request_status_enum;

            CREATE INDEX IF NOT EXISTS idx_student_due_payment_requests_student
                ON student_due_payment_requests (student_id, status, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_student_due_payment_requests_due_payment
                ON student_due_payment_requests (student_due_payment_id, status, created_at DESC);
        `;

        await this.db.query_executor(query);
    }

    getStudentDuesWithRequestState = (studentId) => {
        return this.db.run('get_student_dues_with_request_state', async () => {
            await this.ensurePaymentRequestTable();

            const query = `
                SELECT
                    sdp.*,
                    d.name AS due_name,
                    d.amount AS due_amount,
                    d.bank_account_number,
                    s.current_term AS student_current_term_id,
                    current_term.term_number AS student_current_term_number,
                    due_term.term_number AS due_term_number,
                    COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount,
                    GREATEST(COALESCE(sdp.amount_due_override, d.amount) - COALESCE(sdp.amount_paid, 0), 0) AS outstanding_amount,
                    (
                        COALESCE(sdp.required_for_registration, d.required_for_registration, TRUE) = TRUE
                        AND COALESCE(d.is_active, TRUE) = TRUE
                        AND sdp.waived_at IS NULL
                        AND COALESCE(sdp.amount_paid, 0) < COALESCE(sdp.amount_due_override, d.amount)
                    ) AS is_blocking_registration,
                    latest_request.id AS latest_request_id,
                    latest_request.status AS latest_request_status,
                    latest_request.requested_amount AS latest_requested_amount,
                    latest_request.created_at AS latest_request_created_at
                FROM student_dues_payment sdp
                JOIN students s ON s.user_id = sdp.student_id
                JOIN dues d ON d.id = sdp.due_id
                LEFT JOIN terms current_term ON current_term.id = s.current_term
                LEFT JOIN terms due_term ON due_term.id = sdp.term_id
                LEFT JOIN LATERAL (
                    SELECT
                        pr.id,
                        pr.status,
                        pr.requested_amount,
                        pr.created_at
                    FROM student_due_payment_requests pr
                    WHERE pr.student_due_payment_id = sdp.id
                    ORDER BY pr.created_at DESC, pr.id DESC
                    LIMIT 1
                ) latest_request ON TRUE
                WHERE sdp.student_id = $1
                  AND (sdp.term_id IS NULL OR sdp.term_id = s.current_term)
                ORDER BY
                    (COALESCE(sdp.required_for_registration, d.required_for_registration, TRUE) = TRUE
                        AND COALESCE(d.is_active, TRUE) = TRUE
                        AND sdp.waived_at IS NULL
                        AND COALESCE(sdp.amount_paid, 0) < COALESCE(sdp.amount_due_override, d.amount)
                    ) DESC,
                    COALESCE(sdp.due_date, sdp.deadline) NULLS LAST,
                    sdp.id DESC;
            `;

            const result = await this.db.query_executor(query, [studentId]);
            return result.rows;
        });
    }

    getPaymentRequestsByStudentId = (studentId) => {
        return this.db.run('get_payment_requests_by_student', async () => {
            await this.ensurePaymentRequestTable();

            const query = `
                SELECT
                    pr.*,
                    sdp.due_id,
                    d.name AS due_name,
                    COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount,
                    COALESCE(sdp.amount_paid, 0) AS amount_paid,
                    GREATEST(COALESCE(sdp.amount_due_override, d.amount) - COALESCE(sdp.amount_paid, 0), 0) AS outstanding_amount
                FROM student_due_payment_requests pr
                JOIN student_dues_payment sdp ON sdp.id = pr.student_due_payment_id
                JOIN dues d ON d.id = sdp.due_id
                WHERE pr.student_id = $1
                ORDER BY pr.created_at DESC, pr.id DESC;
            `;

            const result = await this.db.query_executor(query, [studentId]);
            return result.rows;
        });
    }

    createStudentPaymentRequest = (studentId, payload) => {
        return this.db.run('create_student_payment_request', async () => {
            await this.ensurePaymentRequestTable();

            const duePaymentId = Number(payload.student_due_payment_id);
            const requestedAmount = Number(payload.requested_amount);
            const paymentMethod = String(payload.payment_method || '').trim();
            const mobileBankingNumber = payload.mobile_banking_number || null;
            const note = payload.note || null;

            if (!Number.isFinite(duePaymentId) || duePaymentId <= 0) {
                const error = new Error('Valid student_due_payment_id is required.');
                error.status = 400;
                throw error;
            }

            if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
                const error = new Error('requested_amount must be greater than zero.');
                error.status = 400;
                throw error;
            }

            if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
                const error = new Error('payment_method must be Mobile Banking or Bank Transfer.');
                error.status = 400;
                throw error;
            }

            if (paymentMethod === 'Mobile Banking' && !String(mobileBankingNumber || '').trim()) {
                const error = new Error('mobile_banking_number is required for Mobile Banking requests.');
                error.status = 400;
                throw error;
            }

            const client = await this.db.pool.connect();
            try {
                await client.query('BEGIN');

                const duePaymentQuery = `
                    SELECT
                        sdp.id,
                        sdp.student_id,
                        sdp.due_id,
                        COALESCE(sdp.amount_paid, 0) AS amount_paid,
                        COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount,
                        d.name AS due_name,
                        sdp.waived_at,
                        COALESCE(d.is_active, TRUE) AS due_active
                    FROM student_dues_payment sdp
                    JOIN dues d ON d.id = sdp.due_id
                    WHERE sdp.id = $1
                      AND sdp.student_id = $2
                    LIMIT 1
                    FOR UPDATE;
                `;

                const duePaymentResult = await client.query(duePaymentQuery, [duePaymentId, studentId]);
                const duePayment = duePaymentResult.rows[0];

                if (!duePayment) {
                    const error = new Error('Due payment record not found for this student.');
                    error.status = 404;
                    throw error;
                }

                if (!duePayment.due_active || duePayment.waived_at) {
                    const error = new Error('This due item is not payable.');
                    error.status = 400;
                    throw error;
                }

                const currentPaidAmount = Number(duePayment.amount_paid || 0);
                const effectiveDueAmount = Number(duePayment.effective_due_amount || 0);
                const outstandingAmount = Math.max(effectiveDueAmount - currentPaidAmount, 0);

                if (outstandingAmount <= 0) {
                    const error = new Error('This due is already fully paid.');
                    error.status = 400;
                    throw error;
                }

                if (requestedAmount > outstandingAmount) {
                    const error = new Error('Requested amount cannot exceed outstanding amount.');
                    error.status = 400;
                    throw error;
                }

                const nextAmountPaid = Math.max(0, Math.min(effectiveDueAmount, currentPaidAmount + requestedAmount));
                const nextOutstandingAmount = Math.max(effectiveDueAmount - nextAmountPaid, 0);

                let paymentStatus = 'Overdue';
                if (nextAmountPaid >= effectiveDueAmount) {
                    paymentStatus = 'Paid';
                } else if (nextAmountPaid > 0) {
                    paymentStatus = 'Partial';
                }

                const updateDuePaymentQuery = `
                    UPDATE student_dues_payment
                    SET
                        amount_paid = $2,
                        payment_method = COALESCE($3, payment_method),
                        mobile_banking_number = COALESCE($4, mobile_banking_number),
                        paid_at = CURRENT_TIMESTAMP,
                        status = $5
                    WHERE id = $1
                    RETURNING *;
                `;

                const updateDuePaymentResult = await client.query(updateDuePaymentQuery, [
                    duePaymentId,
                    nextAmountPaid,
                    paymentMethod,
                    mobileBankingNumber,
                    paymentStatus,
                ]);

                const insertQuery = `
                    INSERT INTO student_due_payment_requests (
                        student_due_payment_id,
                        student_id,
                        requested_amount,
                        payment_method,
                        mobile_banking_number,
                        note,
                        status,
                        review_note,
                        reviewed_by,
                        reviewed_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'Recorded', 'Auto-recorded on student payment submission.', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *;
                `;

                const insertResult = await client.query(insertQuery, [
                    duePaymentId,
                    studentId,
                    requestedAmount,
                    paymentMethod,
                    mobileBankingNumber,
                    note,
                ]);

                await client.query('COMMIT');

                return {
                    request: {
                        ...insertResult.rows[0],
                        due_name: duePayment.due_name,
                        effective_due_amount: effectiveDueAmount,
                        outstanding_amount: nextOutstandingAmount,
                    },
                    due_payment: updateDuePaymentResult.rows[0] || null,
                };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        });
    }

    getAllPaymentRequests = () => {
        return this.db.run('get_all_payment_requests', async () => {
            await this.ensurePaymentRequestTable();

            const query = `
                SELECT
                    pr.*,
                    sdp.term_id,
                    sdp.due_date,
                    sdp.required_for_registration,
                    sdp.amount_paid,
                    COALESCE(sdp.amount_due_override, d.amount) AS effective_due_amount,
                    GREATEST(COALESCE(sdp.amount_due_override, d.amount) - COALESCE(sdp.amount_paid, 0), 0) AS outstanding_amount,
                    d.name AS due_name,
                    u.name AS student_name,
                    s.roll_number,
                    reviewer.name AS reviewed_by_name
                FROM student_due_payment_requests pr
                JOIN student_dues_payment sdp ON sdp.id = pr.student_due_payment_id
                JOIN dues d ON d.id = sdp.due_id
                LEFT JOIN users u ON u.id = pr.student_id
                LEFT JOIN students s ON s.user_id = pr.student_id
                LEFT JOIN users reviewer ON reviewer.id = pr.reviewed_by
                ORDER BY
                    pr.created_at DESC,
                    pr.id DESC;
            `;

            const result = await this.db.query_executor(query);
            return result.rows;
        });
    }

    reviewStudentPaymentRequest = ({ requestId, action, reviewerId, reviewNote = null }) => {
        return this.db.run('review_student_payment_request', async () => {
            const error = new Error('Manual review is disabled. Payments are recorded automatically on student submission.');
            error.status = 410;
            throw error;
        });
    }
}

module.exports = PaymentModel;
