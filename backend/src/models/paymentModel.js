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

    issueDueRuleNow = (rule_id, actorId = null) => {
        return this.db.run('issue_due_rule_now', async () => {
            const client = await this.db.pool.connect();

            try {
                await client.query('BEGIN');

                const previewResult = await client.query(RULE_CANDIDATE_PREVIEW_QUERY, [rule_id]);
                const previewRows = previewResult.rows;

                if (previewRows.length === 0) {
                    await client.query('COMMIT');
                    return {
                        rule_id: Number(rule_id),
                        issued_count: 0,
                        skipped_count: 0,
                        matched_count: 0,
                    };
                }

                let issuedCount = 0;
                let skippedCount = 0;

                for (const row of previewRows) {
                    if (!row.can_issue) {
                        skippedCount += 1;
                        continue;
                    }

                    const createPaymentQuery = `
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
                        VALUES ($1, $2, 0, $3, 'Overdue', $4, $5, CURRENT_TIMESTAMP, $4, $6)
                        RETURNING id;
                    `;

                    const createPaymentParams = [
                        row.student_id,
                        row.due_id,
                        row.override_amount,
                        row.due_date,
                        row.term_id,
                        row.required_for_registration,
                    ];

                    const paymentResult = await client.query(createPaymentQuery, createPaymentParams);
                    const paymentId = paymentResult.rows[0]?.id;

                    const logQuery = `
                        INSERT INTO due_rule_issuance_log (
                            rule_id,
                            student_id,
                            term_id,
                            student_due_payment_id,
                            note
                        )
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (rule_id, student_id, term_id) DO NOTHING;
                    `;

                    const note = actorId
                        ? `Issued from admin ${actorId}`
                        : 'Issued from admin action';

                    await client.query(logQuery, [rule_id, row.student_id, row.term_id, paymentId, note]);
                    issuedCount += 1;
                }

                await client.query('COMMIT');

                return {
                    rule_id: Number(rule_id),
                    issued_count: issuedCount,
                    skipped_count: skippedCount,
                    matched_count: previewRows.length,
                };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        });
    }
}

module.exports = PaymentModel;
