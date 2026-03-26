const TeacherModel = require('../models/teacherModel.js');
const EnrollmentModel = require('../models/enrollmentModel.js');
const StudentModel = require('../models/studentModel.js');
const DB_Connection = require('../database/db.js');
const bcrypt = require('bcryptjs');

class TeacherController {
    constructor() {
        this.teacherModel = new TeacherModel();
        this.enrollmentModel = new EnrollmentModel();
        this.studentModel = new StudentModel();
        this.db = DB_Connection.getInstance();
    }

    maybeTransitionStudentCurrentTermOnRetakeApproval = async (enrollmentId) => {
        const contextQuery = `
            SELECT
                se.id AS enrollment_id,
                se.student_id,
                se.is_retake,
                approved_term.id AS approved_term_id,
                approved_term.term_number AS approved_term_number,
                approved_term.department_id AS approved_department_id,
                current_term.id AS current_term_id,
                current_term.term_number AS current_term_number
            FROM student_enrollments se
            JOIN course_offerings co ON co.id = se.course_offering_id
            JOIN terms approved_term ON approved_term.id = co.term_id
            JOIN students s ON s.user_id = se.student_id
            LEFT JOIN terms current_term ON current_term.id = s.current_term
            WHERE se.id = $1
            LIMIT 1;
        `;

        const contextResult = await this.db.query_executor(contextQuery, [enrollmentId]);
        const context = contextResult.rows[0];

        if (!context || context.is_retake !== true) {
            return null;
        }

        if (Number(context.current_term_number) === Number(context.approved_term_number)) {
            return null;
        }

        const mappedTerm = await this.studentModel.getDepartmentTermByNumber(
            context.approved_department_id,
            context.approved_term_number
        );

        if (!mappedTerm) {
            return null;
        }

        const updatedStudent = await this.studentModel.setCurrentTermByUserId(
            context.student_id,
            mappedTerm.id
        );

        if (!updatedStudent) {
            return null;
        }

        return {
            student_id: context.student_id,
            previous_term_id: context.current_term_id,
            new_term_id: mappedTerm.id,
            term_number: mappedTerm.term_number,
        };
    }

    getPendingRegistrations = async (req, res) => {
        try {
            const teacherId = Number(req.user?.id);
            const requesterRole = String(req.user?.role || '').toLowerCase();

            if (!teacherId || requesterRole !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can access pending registrations.' });
            }

            const rows = await this.enrollmentModel.getPendingEnrollmentsForAdvisor(teacherId);
            const grouped = new Map();

            for (const row of rows) {
                const key = String(row.student_id);
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        student: {
                            id: row.student_id,
                            name: row.student_name,
                            roll_number: row.roll_number,
                            email: row.student_email,
                        },
                        enrollments: [],
                    });
                }

                grouped.get(key).enrollments.push({
                    enrollment_id: row.enrollment_id,
                    course_offering_id: row.course_offering_id,
                    requested_at: row.enrollment_timestamp,
                    credit_when_taking: row.credit_when_taking,
                    course: {
                        id: row.course_id,
                        code: row.course_code,
                        name: row.course_name,
                        credit_hours: row.credit_hours,
                    },
                    term: {
                        id: row.term_id,
                        term_number: row.term_number,
                        department: {
                            id: row.department_id,
                            code: row.department_code,
                            name: row.department_name,
                        },
                    },
                });
            }

            const pending_registrations = Array.from(grouped.values()).map((group) => ({
                ...group,
                total_enrollments: group.enrollments.length,
            }));

            return res.status(200).json({
                teacher_id: teacherId,
                total_students: pending_registrations.length,
                total_enrollments: rows.length,
                pending_registrations,
            });
        } catch (error) {
            console.error('Get pending registrations error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    decidePendingEnrollment = async (req, res) => {
        try {
            const teacherId = Number(req.user?.id);
            const requesterRole = String(req.user?.role || '').toLowerCase();
            const enrollmentId = Number(req.params.enrollment_id);
            const decision = String(req.body?.decision || '').toLowerCase();

            if (!teacherId || requesterRole !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can decide pending registrations.' });
            }

            if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
                return res.status(400).json({ message: 'Invalid enrollment id.' });
            }

            if (!['approve', 'deny'].includes(decision)) {
                return res.status(400).json({ message: "decision must be either 'approve' or 'deny'." });
            }

            const enrollment = await this.enrollmentModel.getEnrollmentById(enrollmentId);
            if (!enrollment) {
                return res.status(404).json({ message: 'Enrollment not found.' });
            }

            if (String(enrollment.status || '') !== 'Pending') {
                return res.status(409).json({ message: `Enrollment is already ${enrollment.status}.` });
            }

            const isAdvisor = await this.enrollmentModel.isTeacherCurrentAdvisorOfStudent(
                teacherId,
                Number(enrollment.student_id)
            );
            if (!isAdvisor) {
                return res.status(403).json({ message: 'You are not the current advisor for this student.' });
            }

            const targetStatus = decision === 'approve' ? 'Enrolled' : 'Withdrawn';
            const updated = await this.enrollmentModel.setEnrollmentDecisionIfPending(
                enrollmentId,
                targetStatus,
                teacherId
            );

            if (!updated) {
                return res.status(409).json({ message: 'Enrollment is no longer pending.' });
            }

            let currentTermTransition = null;
            if (decision === 'approve') {
                currentTermTransition = await this.maybeTransitionStudentCurrentTermOnRetakeApproval(enrollmentId);
            }

            return res.status(200).json({
                message:
                    decision === 'approve'
                        ? 'Registration approved successfully.'
                        : 'Registration denied successfully.',
                enrollment: updated,
                current_term_transition: currentTermTransition,
            });
        } catch (error) {
            console.error('Decide pending enrollment error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    approveAllPendingForStudent = async (req, res) => {
        try {
            const teacherId = Number(req.user?.id);
            const requesterRole = String(req.user?.role || '').toLowerCase();
            const studentId = Number(req.params.student_id);

            if (!teacherId || requesterRole !== 'teacher') {
                return res.status(403).json({ message: 'Only teachers can approve registrations.' });
            }

            if (!Number.isInteger(studentId) || studentId <= 0) {
                return res.status(400).json({ message: 'Invalid student id.' });
            }

            const isAdvisor = await this.enrollmentModel.isTeacherCurrentAdvisorOfStudent(
                teacherId,
                studentId
            );
            if (!isAdvisor) {
                return res.status(403).json({ message: 'You are not the current advisor for this student.' });
            }

            const updatedRows = await this.enrollmentModel.approveAllPendingForStudentByAdvisor(
                studentId,
                teacherId
            );

            if (updatedRows.length === 0) {
                return res.status(409).json({ message: 'No pending registrations found for this student.' });
            }

            let currentTermTransition = null;
            const approvedRetakeRow = updatedRows.find((row) => row.is_retake === true);
            if (approvedRetakeRow) {
                currentTermTransition = await this.maybeTransitionStudentCurrentTermOnRetakeApproval(approvedRetakeRow.id);
            }

            return res.status(200).json({
                message: 'All pending registrations approved successfully.',
                student_id: studentId,
                approved_count: updatedRows.length,
                enrollments: updatedRows,
                current_term_transition: currentTermTransition,
            });
        } catch (error) {
            console.error('Approve all pending registrations error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    createTeacher = async (req, res) => {
        try {
            const teacher = await this.teacherModel.createTeacher(req.body);
            res.status(201).json(teacher);
        } catch (error) {
            console.error("Create Teacher error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    createTeachersBatch = async (req, res) => {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

        if (!rows.length) {
            return res.status(400).json({ error: "rows array is required for batch import." });
        }

        const normalize = (value) => String(value ?? "").trim();
        const getValue = (row, keys = []) => {
            for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
                    return row[key];
                }
            }
            return "";
        };

        const APPOINTMENT_VALUES = new Set([
            "Department Head",
            "Professor",
            "Assistant Professor",
            "Lecturer",
            "Adjunct Faculty",
        ]);

        const client = await this.db.pool.connect();
        const results = [];
        let inserted = 0;

        try {
            const departmentsResult = await client.query(`SELECT id, code FROM departments;`);
            const departmentByCode = new Map(
                departmentsResult.rows.map((row) => [String(row.code || "").trim().toUpperCase(), row])
            );

            for (let index = 0; index < rows.length; index += 1) {
                const source = rows[index] || {};
                const rowNumber = index + 1;

                const full_name = normalize(getValue(source, ["full_name", "name", "Full Name", "full name"]));
                const email = normalize(
                    getValue(source, ["email", "personal_email", "Personal Email", "personal email"])
                ).toLowerCase();
                const official_mail = normalize(
                    getValue(source, ["official_mail", "Official Email", "official email"])
                ).toLowerCase();
                const mobile_number = normalize(
                    getValue(source, ["mobile_number", "Mobile Number", "mobile number"])
                );
                const present_address = normalize(
                    getValue(source, ["present_address", "Present Address", "present address"])
                );
                const permanent_address = normalize(
                    getValue(source, ["permanent_address", "Permanent Address", "permanent address"])
                );
                const appointment = normalize(
                    getValue(source, ["appointment", "appointment_type", "Appointment Type", "appointment type"])
                );
                const department_code = normalize(
                    getValue(source, ["department_code", "department", "Department", "Department Code"])
                ).toUpperCase();

                // teachers.csv does not contain birth date; this fallback keeps imports usable for seed/demo data.
                const birth_date =
                    normalize(getValue(source, ["birth_date", "Birth Date", "birth date"])) ||
                    "1990-01-01";

                const missing = [];
                if (!full_name) missing.push("full_name");
                if (!email) missing.push("email");
                if (!official_mail) missing.push("official_mail");
                if (!mobile_number) missing.push("mobile_number");
                if (!present_address) missing.push("present_address");
                if (!permanent_address) missing.push("permanent_address");
                if (!appointment) missing.push("appointment");
                if (!department_code) missing.push("department");

                if (appointment && !APPOINTMENT_VALUES.has(appointment)) {
                    missing.push(`appointment (${appointment}) is invalid`);
                }

                const department = departmentByCode.get(department_code);
                if (!department) {
                    missing.push(`department (${department_code}) not found`);
                }

                if (missing.length) {
                    results.push({
                        row: rowNumber,
                        status: "failed",
                        reason: `Validation failed: ${missing.join(", ")}`,
                    });
                    continue;
                }

                try {
                    await client.query("BEGIN");

                    const userEmailExists = await client.query(
                        `SELECT 1 FROM users WHERE email = $1 LIMIT 1;`,
                        [email]
                    );
                    if (userEmailExists.rows.length) {
                        throw new Error(`User email already exists: ${email}`);
                    }

                    const officialEmailExists = await client.query(
                        `SELECT 1 FROM teachers WHERE official_mail = $1 LIMIT 1;`,
                        [official_mail]
                    );
                    if (officialEmailExists.rows.length) {
                        throw new Error(`Official email already exists: ${official_mail}`);
                    }

                    const localPart = email.split("@")[0] || `teacher${rowNumber}`;
                    const defaultPassword = `${localPart}@Univ2026`;
                    const saltRounds = Number(process.env.SALT_ROUND || 10);
                    const password_hash = await bcrypt.hash(defaultPassword, saltRounds);

                    const newUserResult = await client.query(
                        `
                            INSERT INTO users
                                (name, mobile_number, email, password_hash, role, present_address, permanent_address, birth_date)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            RETURNING id;
                        `,
                        [
                            full_name,
                            mobile_number,
                            email,
                            password_hash,
                            "teacher",
                            present_address,
                            permanent_address,
                            birth_date,
                        ]
                    );

                    const user_id = newUserResult.rows[0].id;

                    await client.query(
                        `
                            INSERT INTO initial_credentials (user_id, user_name, raw_password, has_changed)
                            VALUES ($1, $2, $3, FALSE);
                        `,
                        [user_id, full_name, defaultPassword]
                    );

                    await client.query(
                        `
                            INSERT INTO teachers (user_id, appointment, official_mail, department_id)
                            VALUES ($1, $2, $3, $4);
                        `,
                        [user_id, appointment, official_mail, department.id]
                    );

                    await client.query("COMMIT");
                    inserted += 1;
                    results.push({
                        row: rowNumber,
                        status: "inserted",
                        user_id,
                        email,
                        official_mail,
                    });
                } catch (rowError) {
                    await client.query("ROLLBACK");
                    results.push({
                        row: rowNumber,
                        status: "failed",
                        reason: rowError.message,
                    });
                }
            }

            return res.status(200).json({
                total: rows.length,
                inserted,
                failed: rows.length - inserted,
                results,
            });
        } catch (error) {
            console.error("Batch teacher import error:", error);
            return res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    getAllTeachers = async (req, res) => {
        try {
            const teachers = await this.teacherModel.getAllTeachers();
            res.status(200).json(teachers);
        } catch (error) {
            console.error("Get All Teachers error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getTeacherByUserId = async (req, res) => {
        try {
            const teacher = await this.teacherModel.getTeacherByUserId(req.params.user_id);
            if (!teacher) {
                return res.status(404).json({ message: "Teacher not found" });
            }
            res.status(200).json(teacher);
        } catch (error) {
            console.error("Get Teacher By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateTeacher = async (req, res) => {
        try {
            const teacher = await this.teacherModel.updateTeacher(req.params.user_id, req.body);
            if (!teacher) {
                return res.status(404).json({ message: "Teacher not found" });
            }
            res.status(200).json(teacher);
        } catch (error) {
            console.error("Update Teacher error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteTeacher = async (req, res) => {
        try {
            const teacher = await this.teacherModel.deleteTeacher(req.params.user_id);
            if (!teacher) {
                return res.status(404).json({ message: "Teacher not found" });
            }
            res.status(200).json({ message: "Teacher deleted successfully" });
        } catch (error) {
            console.error("Delete Teacher error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TeacherController;
