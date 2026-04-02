const TeacherModel = require('../models/teacherModel.js');
const EnrollmentModel = require('../models/enrollmentModel.js');
const StudentModel = require('../models/studentModel.js');
const MarkingModel = require('../models/markingModel.js');
const DepartmentModel = require('../models/departmentModel.js');
const DB_Connection = require('../database/db.js');
const bcrypt = require('bcryptjs');
const {
    validateAddressField,
    validateEmailField,
    validateNameField,
    validatePhoneField,
} = require('../utils/inputValidation');

class TeacherController {
    constructor() {
        this.teacherModel = new TeacherModel();
        this.enrollmentModel = new EnrollmentModel();
        this.studentModel = new StudentModel();
        this.markingModel = new MarkingModel();
        this.departmentModel = new DepartmentModel();
        this.db = DB_Connection.getInstance();
    }

    requireTeacherRole = (req, res) => {
        if (String(req.user?.role || '').toLowerCase() !== 'teacher') {
            res.status(403).json({ message: 'Only teachers can access this resource.' });
            return false;
        }
        return true;
    }

    requireSystemRole = (req, res) => {
        if (String(req.user?.role || '').toLowerCase() !== 'system') {
            res.status(403).json({ message: 'Only system admin can access this resource.' });
            return false;
        }
        return true;
    }

    getMyResourceOverview = async (req, res) => {
        try {
            if (!this.requireTeacherRole(req, res)) {
                return;
            }

            const teacherId = Number(req.user?.id);
            if (!Number.isInteger(teacherId) || teacherId <= 0) {
                return res.status(400).json({ error: 'Invalid teacher identity.' });
            }

            const teacherContext = await this.teacherModel.getTeacherContextByUserId(teacherId);
            if (!teacherContext) {
                return res.status(404).json({ error: 'Teacher profile not found.' });
            }

            const [adviseeRows, teachingContexts] = await Promise.all([
                this.studentModel.getCurrentAdviseesByTeacherId(teacherId),
                this.markingModel.getTeacherMarkingContexts(teacherId),
            ]);

            const advisees = (Array.isArray(adviseeRows) ? adviseeRows : []).map((row) => ({
                student_id: Number(row.student_id),
                student_name: row.student_name,
                student_email: row.student_email,
                roll_number: row.roll_number,
                student_status: row.student_status,
                advisor_since: row.advisor_since,
                current_term: {
                    id: row.current_term_id ? Number(row.current_term_id) : null,
                    term_number: row.current_term_number ? Number(row.current_term_number) : null,
                    department_id: row.department_id ? Number(row.department_id) : null,
                    department_code: row.department_code || null,
                    department_name: row.department_name || null,
                },
                pending_enrollments_count: Number(row.pending_enrollments_count || 0),
                active_or_archived_enrollments_count: Number(row.active_or_archived_enrollments_count || 0),
            }));

            const rawTeachingContexts = Array.isArray(teachingContexts) ? teachingContexts : [];

            const sectionRows = rawTeachingContexts.map((row) => ({
                course_offering_id: Number(row.course_offering_id),
                section_name: row.section_name,
                term_id: Number(row.term_id),
                term_number: Number(row.term_number),
                department_id: row.department_id ? Number(row.department_id) : null,
                department_code: row.department_code || null,
                department_name: row.department_name || null,
                course: {
                    id: row.course_id ? Number(row.course_id) : null,
                    code: row.course_code,
                    name: row.course_name,
                    credit_hours: row.credit_hours != null ? Number(row.credit_hours) : null,
                },
            }));

            const offeringMap = new Map();
            const courseMap = new Map();

            for (const row of sectionRows) {
                const offeringId = Number(row.course_offering_id);
                if (!offeringMap.has(offeringId)) {
                    offeringMap.set(offeringId, {
                        course_offering_id: offeringId,
                        term_id: row.term_id,
                        term_number: row.term_number,
                        department_id: row.department_id,
                        department_code: row.department_code,
                        department_name: row.department_name,
                        course: row.course,
                        sections: [],
                    });
                }

                const offering = offeringMap.get(offeringId);
                if (!offering.sections.includes(row.section_name)) {
                    offering.sections.push(row.section_name);
                }

                const courseId = Number(row.course?.id);
                if (!courseMap.has(courseId)) {
                    courseMap.set(courseId, {
                        course_id: courseId,
                        course_code: row.course?.code || null,
                        course_name: row.course?.name || null,
                        credit_hours: row.course?.credit_hours ?? null,
                        section_count: 0,
                        offering_count: 0,
                        terms: new Set(),
                    });
                }

                const courseItem = courseMap.get(courseId);
                courseItem.section_count += 1;
                courseItem.terms.add(row.term_number);
            }

            for (const offering of offeringMap.values()) {
                const courseId = Number(offering.course?.id);
                const courseItem = courseMap.get(courseId);
                if (courseItem) {
                    courseItem.offering_count += 1;
                }
            }

            const offerings = Array.from(offeringMap.values()).map((offering) => ({
                ...offering,
                section_count: offering.sections.length,
            }));

            const coursesOffered = Array.from(courseMap.values()).map((course) => ({
                course_id: course.course_id,
                course_code: course.course_code,
                course_name: course.course_name,
                credit_hours: course.credit_hours,
                section_count: course.section_count,
                offering_count: course.offering_count,
                terms: Array.from(course.terms).sort((a, b) => a - b),
            }));

            const totalPendingFromAdvisees = advisees.reduce(
                (sum, row) => sum + Number(row.pending_enrollments_count || 0),
                0
            );

            const ownStats = {
                advisee_count: advisees.length,
                advisees_with_pending_count: advisees.filter(
                    (row) => Number(row.pending_enrollments_count || 0) > 0
                ).length,
                pending_enrollments_total: totalPendingFromAdvisees,
                active_course_offering_count: offerings.length,
                courses_offered_count: coursesOffered.length,
                sections_teaching_count: sectionRows.length,
            };

            const departmentId = teacherContext.department_id ? Number(teacherContext.department_id) : null;
            let departmentHead = {
                is_active_department_head: Boolean(teacherContext.is_active_department_head),
                overview: null,
                faculty: [],
            };

            if (departmentId && departmentHead.is_active_department_head) {
                const [overview, faculty] = await Promise.all([
                    this.departmentModel.getDepartmentOverviewStats(departmentId),
                    this.teacherModel.getDepartmentFacultySnapshot(departmentId),
                ]);

                departmentHead = {
                    is_active_department_head: true,
                    overview,
                    faculty: faculty || [],
                };
            }

            return res.status(200).json({
                teacher: {
                    user_id: Number(teacherContext.user_id),
                    name: teacherContext.name,
                    email: teacherContext.email,
                    mobile_number: teacherContext.mobile_number || null,
                    official_mail: teacherContext.official_mail || null,
                    appointment: teacherContext.appointment || null,
                    department_id: departmentId,
                    department_code: teacherContext.department_code || null,
                    department_name: teacherContext.department_name || null,
                    is_active_department_head: Boolean(teacherContext.is_active_department_head),
                    department_head_start_date: teacherContext.department_head_start_date || null,
                },
                own_stats: ownStats,
                advisor: {
                    is_advisor: advisees.length > 0,
                    total_advisees: advisees.length,
                    total_pending_enrollments: totalPendingFromAdvisees,
                    advisees,
                },
                teaching: {
                    courses_offered: coursesOffered,
                    offerings,
                    sections: sectionRows,
                },
                department_head: departmentHead,
            });
        } catch (error) {
            console.error('Get my teacher resource overview error:', error);
            return res.status(500).json({ error: error.message });
        }
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
            const teacher = await this.teacherModel.createTeacher(req.validatedBody || req.body);
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

                const formatErrors = {};
                validateNameField(formatErrors, 'full_name', full_name, true);
                validateEmailField(formatErrors, 'email', email, true);
                validateEmailField(formatErrors, 'official_mail', official_mail, true);
                validatePhoneField(formatErrors, 'mobile_number', mobile_number, true);
                validateAddressField(formatErrors, 'present_address', present_address, true);
                validateAddressField(formatErrors, 'permanent_address', permanent_address, true);

                if (Object.keys(formatErrors).length > 0) {
                    results.push({
                        row: rowNumber,
                        status: 'failed',
                        reason: `Validation failed: ${Object.values(formatErrors).join(', ')}`,
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

    searchTeachers = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) {
                return;
            }

            const parseOptionalPositiveInt = (value) => {
                if (value === undefined || value === null || value === '') {
                    return null;
                }
                const parsed = Number(value);
                if (!Number.isInteger(parsed) || parsed <= 0) {
                    return NaN;
                }
                return parsed;
            };

            const departmentId = parseOptionalPositiveInt(req.query.department_id);
            if (Number.isNaN(departmentId)) {
                return res.status(400).json({ error: 'department_id must be a positive integer.' });
            }

            const offeringId = parseOptionalPositiveInt(req.query.offering_id);
            if (Number.isNaN(offeringId)) {
                return res.status(400).json({ error: 'offering_id must be a positive integer.' });
            }

            const limitRaw = Number(req.query.limit);
            const offsetRaw = Number(req.query.offset);

            const limit = Number.isInteger(limitRaw)
                ? Math.min(Math.max(limitRaw, 1), 100)
                : 40;
            const offset = Number.isInteger(offsetRaw)
                ? Math.max(offsetRaw, 0)
                : 0;

            const search = String(req.query.search || '').trim();

            const result = await this.teacherModel.searchTeachers({
                department_id: departmentId,
                offering_id: offeringId,
                search,
                limit,
                offset,
            });

            const teachers = (result.rows || []).map((row) => ({
                user_id: Number(row.user_id),
                name: row.name,
                email: row.email,
                official_mail: row.official_mail,
                appointment: row.appointment,
                department_id: row.department_id != null ? Number(row.department_id) : null,
                department_code: row.department_code || null,
                department_name: row.department_name || null,
                is_assigned_to_offering: Boolean(row.is_assigned_to_offering),
                active_section_count: Number(row.active_section_count || 0),
            }));

            return res.status(200).json({
                total: Number(result.total || 0),
                limit,
                offset,
                has_more: offset + teachers.length < Number(result.total || 0),
                teachers,
            });
        } catch (error) {
            console.error('Search teachers error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    getTeacherByUserId = async (req, res) => {
        try {
            const userId = Number(req.validatedParams?.user_id || req.params.user_id);
            const teacher = await this.teacherModel.getTeacherByUserId(userId);
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
            const userId = Number(req.validatedParams?.user_id || req.params.user_id);
            const existing = await this.teacherModel.getTeacherByUserId(userId);
            if (!existing) {
                return res.status(404).json({ message: "Teacher not found" });
            }

            const mergedPayload = {
                appointment: Object.prototype.hasOwnProperty.call(req.validatedBody || {}, 'appointment')
                    ? req.validatedBody.appointment
                    : existing.appointment,
                official_mail: Object.prototype.hasOwnProperty.call(req.validatedBody || {}, 'official_mail')
                    ? req.validatedBody.official_mail
                    : existing.official_mail,
                department_id: Object.prototype.hasOwnProperty.call(req.validatedBody || {}, 'department_id')
                    ? req.validatedBody.department_id
                    : existing.department_id,
            };

            const teacher = await this.teacherModel.updateTeacher(userId, mergedPayload);
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
            const userId = Number(req.validatedParams?.user_id || req.params.user_id);
            const teacher = await this.teacherModel.deleteTeacher(userId);
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
