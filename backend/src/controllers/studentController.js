const StudentModel = require('../models/studentModel.js');
const EnrollmentModel = require('../models/enrollmentModel.js');
const CourseModel = require('../models/courseModel.js');
const SectionModel = require('../models/sectionModel.js');
const DB_Connection = require('../database/db.js');
const bcrypt = require('bcryptjs');

class StudentController {
    constructor() {
        this.studentModel = new StudentModel();
        this.enrollmentModel = new EnrollmentModel();
        this.courseModel = new CourseModel();
        this.sectionModel = new SectionModel();
        this.db = DB_Connection.getInstance();
    }

    createStudent = async (req, res) => {
        try {
            const student = await this.studentModel.createStudent(req.body);
            res.status(201).json(student);
        } catch (error) {
            console.error("Create Student error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    createStudentsBatch = async (req, res) => {
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

        const client = await this.db.pool.connect();
        const results = [];
        let inserted = 0;

        try {
            const departmentsResult = await client.query(`SELECT id, code FROM departments;`);
            const termsResult = await client.query(`SELECT id, term_number, department_id FROM terms;`);

            const departmentByCode = new Map(
                departmentsResult.rows.map((row) => [String(row.code || "").trim().toUpperCase(), row])
            );

            const termByDeptAndNumber = new Map(
                termsResult.rows.map((row) => [`${row.department_id}-${row.term_number}`, row.id])
            );

            for (let index = 0; index < rows.length; index += 1) {
                const source = rows[index] || {};
                const rowNumber = index + 1;

                const full_name = normalize(getValue(source, ["full_name", "name", "Full Name", "full name"]));
                const roll_number = normalize(
                    getValue(source, ["roll_number", "Roll Number", "roll number"])
                ).toUpperCase();
                const email = normalize(
                    getValue(source, ["email", "personal_email", "Personal Email", "personal email"])
                ).toLowerCase();
                const official_mail = normalize(
                    getValue(source, ["official_mail", "Official Email", "official email"])
                ).toLowerCase();
                const mobile_number = normalize(
                    getValue(source, ["mobile_number", "Mobile Number", "mobile number"])
                );
                const birth_date = normalize(
                    getValue(source, ["birth_date", "Birth Date", "birth date"])
                );
                const present_address = normalize(
                    getValue(source, ["present_address", "Present Address", "present address"])
                );
                const permanent_address = normalize(
                    getValue(source, ["permanent_address", "Permanent Address", "permanent address"])
                );
                const department_code = normalize(
                    getValue(source, ["department_code", "Department Code", "department", "Department"])
                ).toUpperCase();
                const current_term_value = normalize(
                    getValue(source, ["current_term", "Current Term", "current term", "term_number"])
                );

                const missing = [];
                if (!full_name) missing.push("full_name");
                if (!roll_number) missing.push("roll_number");
                if (!email) missing.push("email");
                if (!official_mail) missing.push("official_mail");
                if (!mobile_number) missing.push("mobile_number");
                if (!birth_date) missing.push("birth_date");
                if (!present_address) missing.push("present_address");
                if (!permanent_address) missing.push("permanent_address");
                if (!department_code) missing.push("department_code");
                if (!current_term_value) missing.push("current_term");

                const term_number = Number(current_term_value);
                if (!Number.isInteger(term_number) || term_number <= 0) {
                    missing.push("current_term (must be a positive integer)");
                }

                const department = departmentByCode.get(department_code);
                if (!department) {
                    missing.push(`department_code (${department_code}) not found`);
                }

                const term_id = department
                    ? termByDeptAndNumber.get(`${department.id}-${term_number}`)
                    : null;

                if (department && !term_id) {
                    missing.push(`term ${term_number} not found for department ${department_code}`);
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

                    const emailExists = await client.query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1;`, [email]);
                    if (emailExists.rows.length) {
                        throw new Error(`User email already exists: ${email}`);
                    }

                    const rollExists = await client.query(`SELECT 1 FROM students WHERE roll_number = $1 LIMIT 1;`, [roll_number]);
                    if (rollExists.rows.length) {
                        throw new Error(`Roll number already exists: ${roll_number}`);
                    }

                    const officialExists = await client.query(
                        `SELECT 1 FROM students WHERE official_mail = $1 LIMIT 1;`,
                        [official_mail]
                    );
                    if (officialExists.rows.length) {
                        throw new Error(`Official email already exists: ${official_mail}`);
                    }

                    const defaultPassword = `${roll_number}@Univ2026`;
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
                            "student",
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
                            INSERT INTO students (user_id, roll_number, official_mail, status, current_term)
                            VALUES ($1, $2, $3, $4, $5);
                        `,
                        [user_id, roll_number, official_mail, "Active", term_id]
                    );

                    await client.query("COMMIT");
                    inserted += 1;
                    results.push({
                        row: rowNumber,
                        status: "inserted",
                        user_id,
                        roll_number,
                        email,
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
            console.error("Batch student import error:", error);
            return res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    getAllResults = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }

            const includeCurrentTerm = String(req.query.include_current || '').toLowerCase() === 'true';

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const terms = await this.enrollmentModel.getStudentResultTerms(student_id, includeCurrentTerm);

            const termResults = [];
            for (const term of terms) {
                const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

                termResults.push({
                    term: {
                        id: term.id,
                        term_number: term.term_number,
                        start_date: term.start_date,
                        end_date: term.end_date,
                        department_id: term.department_id,
                    },
                    results: rows,
                });
            }

            res.status(200).json({
                student_id,
                include_current: includeCurrentTerm,
                terms: termResults,
            });
        } catch (error) {
            console.error('Get all student results error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getResultsByTermNumber = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            const term_number = Number(req.params.term_number);

            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }
            if (!Number.isInteger(term_number) || term_number <= 0) {
                return res.status(400).json({ error: 'Invalid term number.' });
            }

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const studentDept = await this.studentModel.getStudentDepartment(student_id);
            if (!studentDept || !studentDept.department_id) {
                return res.status(400).json({ error: 'Student has no department assigned' });
            }

            const termQuery = `
                SELECT * FROM terms
                WHERE term_number = $1 AND department_id = $2
                ORDER BY start_date DESC
                LIMIT 1;
            `;
            const termResult = await this.db.query_executor(termQuery, [term_number, studentDept.department_id]);

            if (termResult.rows.length === 0) {
                return res.status(404).json({ error: `Term ${term_number} not found for department` });
            }

            const term = termResult.rows[0];
            const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

            res.status(200).json({
                student_id,
                term: {
                    id: term.id,
                    term_number: term.term_number,
                    start_date: term.start_date,
                    end_date: term.end_date,
                    department_id: term.department_id,
                },
                results: rows,
            });
        } catch (error) {
            console.error('Get student result by term number error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllStudents = async (req, res) => {
        try {
            const students = await this.studentModel.getAllStudents();
            res.status(200).json(students);
        } catch (error) {
            console.error("Get All Students error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllResults = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }

            const includeCurrentTerm = String(req.query.include_current || '').toLowerCase() === 'true';

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const terms = await this.enrollmentModel.getStudentResultTerms(student_id, includeCurrentTerm);

            const termResults = [];
            for (const term of terms) {
                const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

                termResults.push({
                    term: {
                        id: term.id,
                        term_number: term.term_number,
                        start_date: term.start_date,
                        end_date: term.end_date,
                        department_id: term.department_id,
                    },
                    results: rows,
                });
            }

            res.status(200).json({
                student_id,
                include_current: includeCurrentTerm,
                terms: termResults,
            });
        } catch (error) {
            console.error('Get all student results error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getResultsByTermNumber = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            const term_number = Number(req.params.term_number);

            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }
            if (!Number.isInteger(term_number) || term_number <= 0) {
                return res.status(400).json({ error: 'Invalid term number.' });
            }

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const studentDept = await this.studentModel.getStudentDepartment(student_id);
            if (!studentDept || !studentDept.department_id) {
                return res.status(400).json({ error: 'Student has no department assigned' });
            }

            const termQuery = `
                SELECT * FROM terms
                WHERE term_number = $1 AND department_id = $2
                ORDER BY start_date DESC
                LIMIT 1;
            `;
            const termResult = await this.db.query_executor(termQuery, [term_number, studentDept.department_id]);

            if (termResult.rows.length === 0) {
                return res.status(404).json({ error: `Term ${term_number} not found for department` });
            }

            const term = termResult.rows[0];
            const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

            res.status(200).json({
                student_id,
                term: {
                    id: term.id,
                    term_number: term.term_number,
                    start_date: term.start_date,
                    end_date: term.end_date,
                    department_id: term.department_id,
                },
                results: rows,
            });
        } catch (error) {
            console.error('Get student result by term number error:', error);
            res.status(500).json({ error: error.message });
        }
    }


    getStudentByUserId = async (req, res) => {
        try {
            const student = await this.studentModel.getStudentByUserId(req.params.user_id);
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }
            res.status(200).json(student);
        } catch (error) {
            console.error("Get Student By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getStudentByRollNumber = async (req, res) => {
        try {
            const student = await this.studentModel.getStudentByRollNumber(req.params.roll_number);
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }
            res.status(200).json(student);
        } catch (error) {
            console.error("Get Student By Roll Number error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateStudent = async (req, res) => {
        try {
            const student = await this.studentModel.updateStudent(req.params.user_id, req.body);
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }
            res.status(200).json(student);
        } catch (error) {
            console.error("Update Student error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteStudent = async (req, res) => {
        try {
            const student = await this.studentModel.deleteStudent(req.params.user_id);
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }
            res.status(200).json({ message: "Student deleted successfully" });
        } catch (error) {
            console.error("Delete Student error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // Registration endpoints
    registerForCourses = async (req, res) => {
        const client = await this.db.pool.connect();
        
        try {
            const student_id = parseInt(req.params.user_id);
            const { term_number, section_name, course_offering_ids } = req.body;
            const normalizedSectionName = typeof section_name === 'string' ? section_name.trim() : '';

            // Validate input
            if (!term_number || !course_offering_ids || !Array.isArray(course_offering_ids) || course_offering_ids.length === 0) {
                return res.status(400).json({ 
                    error: "Missing required fields: term_number and course_offering_ids array" 
                });
            }

            await client.query('BEGIN');

            // 1. Check registration period
            const regPeriodQuery = `SELECT * FROM current_state LIMIT 1;`;
            const regPeriodResult = await client.query(regPeriodQuery);
            
            if (regPeriodResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: "Registration period not configured" });
            }

            const { reg_start, reg_end } = regPeriodResult.rows[0];
            const currentDate = new Date();
            
            if (currentDate < new Date(reg_start) || currentDate > new Date(reg_end)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Registration is not open. Period: ${reg_start} to ${reg_end}` 
                });
            }

            // 2. Get student and verify status
            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: "Student not found" });
            }

            if (student.status !== 'Active') {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Student status is ${student.status}. Only Active students can register.` });
            }

            const hasPendingEnrollment = await this.enrollmentModel.hasAnyPendingEnrollment(student_id);
            if (hasPendingEnrollment) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'You already have pending registration requests. Please wait for advisor decision before registering again.'
                });
            }

            // 3. Get student's department
            const studentDept = await this.studentModel.getStudentDepartment(student_id);
            if (!studentDept || !studentDept.department_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: "Student has no department assigned" });
            }

            // 4. Get term by term_number and department
            const termQuery = `
                SELECT * FROM terms 
                WHERE term_number = $1 AND department_id = $2
                ORDER BY start_date DESC
                LIMIT 1;
            `;
            const termResult = await client.query(termQuery, [term_number, studentDept.department_id]);
            
            if (termResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Term ${term_number} not found for department ${studentDept.department_name}` 
                });
            }

            const term = termResult.rows[0];

            // 5. Check required blocking dues for the target term
            const blockingDues = await this.studentModel.getBlockingDuesForRegistration(student_id, term.id);
            if (blockingDues.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: "Cannot register with unpaid required dues",
                    overdue_dues: blockingDues
                });
            }

            // 6. Get student's completed courses (for prerequisite checking)
            const completedCourses = await this.studentModel.getCompletedCourses(student_id);
            const completedCourseIds = completedCourses.map(c => c.course_id);

            // 7. Get current term credits already enrolled
            const currentCredits = await this.enrollmentModel.getTotalCreditsForTerm(student_id, term.id);

            // 8. Process each course offering
            const enrollments = [];
            const warnings = [];
            let totalNewCredits = 0;
            let selectedOptionalCount = 0;
            let selectedOptionalCredits = 0;
            let hasRetakeSelection = false;

            for (const offering_id of course_offering_ids) {
                // Get course offering details
                const offering = await this.courseModel.getCourseOfferingDetails(offering_id);
                
                if (!offering) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Course offering ${offering_id} not found` 
                    });
                }

                if (offering.is_active === false) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `Course offering ${offering_id} is not active`
                    });
                }

                // Verify offering is for the selected term
                if (offering.term_id !== term.id) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Course offering ${offering_id} is not for term ${term_number}` 
                    });
                }

                // Verify course is from student's department
                if (offering.department_id !== studentDept.department_id) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Course ${offering.course_code} is not from your department` 
                    });
                }

                // Check for duplicate enrollment
                const existingEnrollment = await this.enrollmentModel.checkExistingEnrollment(student_id, offering_id);
                if (existingEnrollment) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Already enrolled in ${offering.course_code}` 
                    });
                }

                // Check prerequisites
                const prerequisites = await this.courseModel.getCoursePrerequisites(offering.course_id);
                const missingPrereqs = prerequisites.filter(prereq => 
                    !completedCourseIds.includes(prereq.prereq_id)
                );

                if (missingPrereqs.length > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Missing prerequisites for ${offering.course_code}`,
                        missing_prerequisites: missingPrereqs.map(p => ({
                            code: p.course_code,
                            name: p.name
                        }))
                    });
                }

                // Check if this is a retake and validate
                const attemptSummary = await this.enrollmentModel.getCourseAttemptSummary(student_id, offering.course_id);
                const isRetake = attemptSummary.attempt_count > 0;
                if (isRetake) {
                    hasRetakeSelection = true;
                }
                
                // Block enrollment if student has ever passed this course in any term.
                if (attemptSummary.has_passed) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Cannot re-enroll in ${offering.course_code}. You already passed this course in a previous attempt.`
                    });
                }

                // Check capacity (warning only)
                const enrollmentCount = await this.courseModel.getCourseOfferingEnrollmentCount(offering_id);
                if (offering.max_capacity && enrollmentCount >= offering.max_capacity) {
                    warnings.push({
                        course_code: offering.course_code,
                        message: `Course is at or over capacity (${enrollmentCount}/${offering.max_capacity})`
                    });
                }

                totalNewCredits += parseFloat(offering.credit_hours);
                if (offering.is_optional) {
                    selectedOptionalCount += 1;
                    selectedOptionalCredits += parseFloat(offering.credit_hours);
                }

                // Prepare enrollment data
                enrollments.push({
                    student_id,
                    course_offering_id: offering_id,
                    credit_when_taking: offering.credit_hours,
                    status: 'Pending',
                    is_retake: isRetake
                });
            }

            // 9. Check credit limit from term
            const termCreditLimit = Number(term.max_credit || 23);
            const totalCredits = parseFloat(currentCredits) + totalNewCredits;
            if (totalCredits > termCreditLimit) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Credit limit exceeded. Current: ${currentCredits}, Attempting to add: ${totalNewCredits}, Total: ${totalCredits}, Max: ${termCreditLimit}` 
                });
            }

            if (hasRetakeSelection) {
                const activeRetakeTermIds = await this.enrollmentModel.getActiveRetakeTermIds(student_id);
                const hasDifferentActiveRetakeTerm = activeRetakeTermIds.some((activeTermId) => activeTermId !== Number(term.id));

                if (hasDifferentActiveRetakeTerm) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: 'Retake registration is allowed in only one active term at a time.'
                    });
                }
            }

            // 10. Resolve section assignment mode.
            let resolvedSectionName = null;
            let sectionAssignment = null;

            if (hasRetakeSelection) {
                if (!normalizedSectionName) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: 'Section selection is required when registering retake courses.'
                    });
                }

                const sectionExists = await this.sectionModel.checkSectionExists(term.id, normalizedSectionName);
                if (!sectionExists) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `Section ${normalizedSectionName} does not exist for term ${term_number}`
                    });
                }

                resolvedSectionName = normalizedSectionName;
                sectionAssignment = await this.sectionModel.assignStudentToSection(student_id, resolvedSectionName, 'r');
            } else {
                const autoSection = await this.sectionModel.resolveRegistrationSection(student_id, term.id);
                if (!autoSection || !autoSection.section_name) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `No section found for term ${term_number}. Please contact your department office.`
                    });
                }

                resolvedSectionName = autoSection.section_name;
                sectionAssignment = await this.sectionModel.assignStudentToSection(student_id, resolvedSectionName, 'n');
            }

            // 11. Create all enrollments
            const createdEnrollments = [];
            for (const enrollment of enrollments) {
                const created = await this.enrollmentModel.createEnrollment(enrollment);
                createdEnrollments.push(created);
            }

            // 12. Get advisor info
            const advisor = await this.studentModel.getCurrentAdvisor(student_id);

            await client.query('COMMIT');

            res.status(201).json({
                message: "Registration successful. Enrollments pending advisor approval.",
                enrollments: createdEnrollments,
                section_assignment: sectionAssignment,
                section_mode: hasRetakeSelection ? 'retake' : 'auto',
                section_name: resolvedSectionName,
                advisor: advisor ? {
                    id: advisor.teacher_id,
                    name: advisor.advisor_name,
                    email: advisor.advisor_email
                } : null,
                credits: {
                    previous: parseFloat(currentCredits),
                    new: totalNewCredits,
                    total: totalCredits,
                    limit: termCreditLimit
                },
                optional_load: {
                    selected_optional_courses: selectedOptionalCount,
                    selected_optional_credits: selectedOptionalCredits,
                },
                warnings: warnings.length > 0 ? warnings : undefined
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Register for courses error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    getAvailableCourses = async (req, res) => {
        try {
            const student_id = parseInt(req.params.user_id);
            const term_number = parseInt(req.query.term_number);

            if (!term_number) {
                return res.status(400).json({ error: "term_number query parameter required" });
            }

            // Get student's department
            const studentDept = await this.studentModel.getStudentDepartment(student_id);
            if (!studentDept || !studentDept.department_id) {
                return res.status(400).json({ error: "Student has no department assigned" });
            }

            // Get term
            const termQuery = `
                SELECT * FROM terms 
                WHERE term_number = $1 AND department_id = $2
                ORDER BY start_date DESC
                LIMIT 1;
            `;
            const termResult = await this.db.query_executor(termQuery, [term_number, studentDept.department_id]);
            
            if (termResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: `Term ${term_number} not found for department` 
                });
            }

            const term = termResult.rows[0];

            // Get course offerings for this term and department
            const offerings = await this.courseModel.getCourseOfferingsByTerm(term.id, studentDept.department_id);

            // Get student's completed courses
            const completedCourses = await this.studentModel.getCompletedCourses(student_id);
            const completedCourseIds = completedCourses.map(c => c.course_id);

            // Get active enrollments in this term (Pending/Enrolled only)
            const currentEnrollments = await this.enrollmentModel.getActiveEnrollmentsByStudentAndTerm(student_id, term.id);
            const enrolledOfferingIds = currentEnrollments.map(e => e.course_offering_id);

            // Enrich offerings with additional info
            const enrichedOfferings = await Promise.all(offerings.map(async (offering) => {
                const prerequisites = await this.courseModel.getCoursePrerequisites(offering.course_id);
                const enrollmentCount = await this.courseModel.getCourseOfferingEnrollmentCount(offering.id);
                const attemptSummary = await this.enrollmentModel.getCourseAttemptSummary(student_id, offering.course_id);
                
                const missingPrereqs = prerequisites.filter(prereq => 
                    !completedCourseIds.includes(prereq.prereq_id)
                );

                const isAlreadyEnrolled = enrolledOfferingIds.includes(offering.id);

                // Check if student has ever passed this course before (grades D or better).
                const hasPassed = attemptSummary.has_passed;
                
                // Student can enroll if:
                // - Not already enrolled in this term
                // - All prerequisites are met
                // - Haven't passed this course before (can only retake if failed with F or no grade)
                const canEnroll = !isAlreadyEnrolled && 
                                  missingPrereqs.length === 0 && 
                                  !hasPassed;

                return {
                    ...offering,
                    prerequisites,
                    missing_prerequisites: missingPrereqs,
                    can_enroll: canEnroll,
                    is_retake: attemptSummary.attempt_count > 0,
                    previous_grade: attemptSummary.latest_grade,
                    already_enrolled: isAlreadyEnrolled,
                    enrollment_count: enrollmentCount,
                    capacity_available: offering.max_capacity ? offering.max_capacity - enrollmentCount : null
                };
            }));

            res.status(200).json({
                term: {
                    id: term.id,
                    term_number: term.term_number,
                    start_date: term.start_date,
                    end_date: term.end_date,
                    max_credit: Number(term.max_credit || 23),
                },
                courses: enrichedOfferings
            });

        } catch (error) {
            console.error("Get available courses error:", error);
            res.status(500).json({ error: error.message });
        }
    }



    getRegistrationEligibility = async (req, res) => {
        try {
            const student_id = parseInt(req.params.user_id);
            const term_number = parseInt(req.query.term_number);

            if (!term_number) {
                return res.status(400).json({ error: "term_number query parameter required" });
            }

            // Check registration period
            const regPeriodQuery = `SELECT * FROM current_state LIMIT 1;`;
            const regPeriodResult = await this.db.query_executor(regPeriodQuery);
            
            let registrationOpen = false;
            let registrationPeriod = null;

            if (regPeriodResult.rows.length > 0) {
                const { reg_start, reg_end } = regPeriodResult.rows[0];
                const currentDate = new Date();
                registrationOpen = currentDate >= new Date(reg_start) && currentDate <= new Date(reg_end);
                registrationPeriod = { reg_start, reg_end };
            }

            // Get student
            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: "Student not found" });
            }

            // Get student's department
            const studentDept = await this.studentModel.getStudentDepartment(student_id);

            // Get term
            let term = null;
            if (studentDept && studentDept.department_id) {
                const termQuery = `
                    SELECT * FROM terms 
                    WHERE term_number = $1 AND department_id = $2
                    ORDER BY start_date DESC
                    LIMIT 1;
                `;
                const termResult = await this.db.query_executor(termQuery, [term_number, studentDept.department_id]);
                
                if (termResult.rows.length > 0) {
                    term = termResult.rows[0];
                }
            }

            // Check dues (required dues for this term only)
            const blockingDues = term
                ? await this.studentModel.getBlockingDuesForRegistration(student_id, term.id)
                : await this.studentModel.getBlockingDuesForRegistration(student_id, null);

            // Get advisor
            const advisor = await this.studentModel.getCurrentAdvisor(student_id);

            // Get sections for term
            let sections = [];
            if (term) {
                sections = await this.sectionModel.getSectionsByTermId(term.id);
            }

            // Get current credits
            let currentCredits = 0;
            if (term) {
                currentCredits = await this.enrollmentModel.getTotalCreditsForTerm(student_id, term.id);
            }

            const eligible = registrationOpen && 
                           student.status === 'Active' && 
                           blockingDues.length === 0 &&
                           !!studentDept.department_id &&
                           !!term;

            res.status(200).json({
                eligible,
                registration_open: registrationOpen,
                registration_period: registrationPeriod,
                student_status: student.status,
                student_active: student.status === 'Active',
                department: studentDept ? {
                    id: studentDept.department_id,
                    code: studentDept.code,
                    name: studentDept.department_name
                } : null,
                term: term ? {
                    id: term.id,
                    term_number: term.term_number,
                    start_date: term.start_date,
                    end_date: term.end_date,
                    max_credit: Number(term.max_credit || 23),
                } : null,
                overdue_dues: blockingDues,
                has_overdue_dues: blockingDues.length > 0,
                advisor: advisor ? {
                    id: advisor.teacher_id,
                    name: advisor.advisor_name,
                    email: advisor.advisor_email
                } : null,
                sections,
                credits: {
                    current: parseFloat(currentCredits),
                    remaining: (Number(term?.max_credit || 23) - parseFloat(currentCredits)),
                    limit: Number(term?.max_credit || 23),
                }
            });

        } catch (error) {
            console.error("Get registration eligibility error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAcademicOverview = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }

            const requesterRole = String(req.user?.role || '').toLowerCase();
            const requesterId = Number(req.user?.id);
            const canReadStudentAcademic = requesterRole === 'student' || requesterRole === 'system' || requesterRole === 'admin';

            if (!canReadStudentAcademic) {
                return res.status(403).json({ error: 'You are not allowed to access student academic overview.' });
            }

            if (requesterRole === 'student' && requesterId !== student_id) {
                return res.status(403).json({ error: 'You are not allowed to access another student overview.' });
            }

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found.' });
            }

            const context = await this.studentModel.getCurrentAcademicContextByStudentId(student_id);
            if (!context) {
                return res.status(404).json({ error: 'Student academic context not found.' });
            }

            const toNumber = (value, fallback = 0) => {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            };

            const termId = Number(context.term_id);
            const maxCredit = toNumber(context.max_credit, 23);

            if (!Number.isInteger(termId) || termId <= 0) {
                return res.status(200).json({
                    student: {
                        user_id: student_id,
                        name: context.student_name,
                        email: context.student_email,
                        profile_image_url: context.profile_image_url || null,
                        roll_number: context.roll_number,
                        official_mail: context.official_mail || null,
                        status: context.student_status,
                    },
                    academic_overview: {
                        term: null,
                        department: null,
                        advisor: context.advisor_id
                            ? {
                                id: Number(context.advisor_id),
                                name: context.advisor_name,
                                email: context.advisor_email,
                                appointment: context.advisor_appointment,
                            }
                            : null,
                        credits: {
                            current: 0,
                            limit: maxCredit,
                            remaining: maxCredit,
                        },
                    },
                    enrolled_courses: [],
                    progress_tracker: [],
                    term_result_snapshot: [],
                });
            }

            const [enrollmentRows, termResultRows, currentCreditsRaw] = await Promise.all([
                this.enrollmentModel.getStudentCoursesForTermWithTeacher(student_id, termId),
                this.enrollmentModel.getStudentTermResults(student_id, termId),
                this.enrollmentModel.getTotalCreditsForTerm(student_id, termId),
            ]);

            const enrollmentIds = (Array.isArray(enrollmentRows) ? enrollmentRows : [])
                .map((row) => Number(row.enrollment_id))
                .filter((id) => Number.isInteger(id) && id > 0);

            const publishedComponents = enrollmentIds.length > 0
                ? await this.markingModel.getPublishedComponentsByEnrollmentIds(enrollmentIds)
                : [];

            const componentsByEnrollmentId = new Map();
            for (const component of publishedComponents || []) {
                const enrollmentId = Number(component.enrollment_id);
                if (!componentsByEnrollmentId.has(enrollmentId)) {
                    componentsByEnrollmentId.set(enrollmentId, []);
                }

                componentsByEnrollmentId.get(enrollmentId).push({
                    id: Number(component.id),
                    type: component.type,
                    total_marks: toNumber(component.total_marks, 0),
                    marks_obtained: toNumber(component.marks_obtained, 0),
                    status: component.status,
                });
            }

            const termResultByEnrollmentId = new Map();
            for (const row of termResultRows || []) {
                const enrollmentId = Number(row.enrollment_id);
                if (Number.isInteger(enrollmentId) && enrollmentId > 0) {
                    termResultByEnrollmentId.set(enrollmentId, row);
                }
            }

            const enrolledCourses = (enrollmentRows || []).map((row) => {
                const enrollmentId = Number(row.enrollment_id);
                const marks = componentsByEnrollmentId.get(enrollmentId) || [];
                const marksObtained = marks.reduce((sum, item) => sum + toNumber(item.marks_obtained, 0), 0);
                const marksTotal = marks.reduce((sum, item) => sum + toNumber(item.total_marks, 0), 0);
                const progressPercentage = marksTotal > 0
                    ? Number(((marksObtained * 100) / marksTotal).toFixed(2))
                    : null;

                const termResult = termResultByEnrollmentId.get(enrollmentId) || null;

                return {
                    enrollment_id: enrollmentId,
                    course_offering_id: Number(row.course_offering_id),
                    enrollment_status: row.enrollment_status,
                    grade: row.grade || null,
                    is_retake: Boolean(row.is_retake),
                    credit_when_taking: toNumber(row.credit_when_taking, 0),
                    course: {
                        id: Number(row.course_id),
                        code: row.course_code,
                        name: row.course_name,
                        credit_hours: toNumber(row.credit_hours, 0),
                        is_optional: Boolean(row.is_optional),
                    },
                    section_name: row.section_name || null,
                    teacher: row.teacher_id
                        ? {
                            id: Number(row.teacher_id),
                            name: row.teacher_name,
                            email: row.teacher_email,
                            official_mail: row.teacher_official_mail,
                            appointment: row.teacher_appointment,
                            department_code: row.teacher_department_code,
                            department_name: row.teacher_department_name,
                        }
                        : null,
                    published_components: marks,
                    progress: {
                        obtained: Number(marksObtained.toFixed(2)),
                        total: Number(marksTotal.toFixed(2)),
                        percentage: progressPercentage,
                    },
                    term_result: termResult
                        ? {
                            total_score: toNumber(termResult.total_score, 0),
                            percentage: toNumber(termResult.percentage, 0),
                            grade: termResult.grade || null,
                            ct_best3_score: toNumber(termResult.ct_best3_score, 0),
                            attendance_score: toNumber(termResult.attendance_score, 0),
                            final_score: toNumber(termResult.final_score, 0),
                        }
                        : null,
                };
            });

            const progressTracker = enrolledCourses.map((course) => ({
                enrollment_id: course.enrollment_id,
                course_offering_id: course.course_offering_id,
                course_code: course.course.code,
                course_name: course.course.name,
                enrollment_status: course.enrollment_status,
                marks: course.published_components,
                progress: course.progress,
                term_result: course.term_result,
            }));

            const currentCredits = toNumber(currentCreditsRaw, 0);
            const remainingCredits = Number((maxCredit - currentCredits).toFixed(1));

            return res.status(200).json({
                student: {
                    user_id: student_id,
                    name: context.student_name,
                    email: context.student_email,
                    profile_image_url: context.profile_image_url || null,
                    roll_number: context.roll_number,
                    official_mail: context.official_mail || null,
                    status: context.student_status,
                },
                academic_overview: {
                    term: {
                        id: termId,
                        term_number: Number(context.term_number),
                        start_date: context.term_start_date,
                        end_date: context.term_end_date,
                    },
                    department: context.department_id
                        ? {
                            id: Number(context.department_id),
                            code: context.department_code,
                            name: context.department_name,
                        }
                        : null,
                    advisor: context.advisor_id
                        ? {
                            id: Number(context.advisor_id),
                            name: context.advisor_name,
                            email: context.advisor_email,
                            appointment: context.advisor_appointment,
                        }
                        : null,
                    credits: {
                        current: currentCredits,
                        limit: maxCredit,
                        remaining: remainingCredits,
                    },
                },
                enrolled_courses: enrolledCourses,
                progress_tracker: progressTracker,
                term_result_snapshot: termResultRows || [],
            });
        } catch (error) {
            console.error('Get academic overview error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    getAllResults = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }

            const includeCurrentTerm = String(req.query.include_current || '').toLowerCase() === 'true';

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const terms = await this.enrollmentModel.getStudentResultTerms(student_id, includeCurrentTerm);

            const termResults = [];
            for (const term of terms) {
                const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

                termResults.push({
                    term: {
                        id: term.id,
                        term_number: term.term_number,
                        start_date: term.start_date,
                        end_date: term.end_date,
                        department_id: term.department_id,
                    },
                    results: rows,
                });
            }

            res.status(200).json({
                student_id,
                include_current: includeCurrentTerm,
                terms: termResults,
            });
        } catch (error) {
            console.error('Get all student results error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getResultsByTermNumber = async (req, res) => {
        try {
            const student_id = Number(req.params.user_id);
            const term_number = Number(req.params.term_number);

            if (!Number.isInteger(student_id) || student_id <= 0) {
                return res.status(400).json({ error: 'Invalid student id.' });
            }
            if (!Number.isInteger(term_number) || term_number <= 0) {
                return res.status(400).json({ error: 'Invalid term number.' });
            }

            const student = await this.studentModel.getStudentByUserId(student_id);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const studentDept = await this.studentModel.getStudentDepartment(student_id);
            if (!studentDept || !studentDept.department_id) {
                return res.status(400).json({ error: 'Student has no department assigned' });
            }

            const termQuery = `
                SELECT * FROM terms
                WHERE term_number = $1 AND department_id = $2
                ORDER BY start_date DESC
                LIMIT 1;
            `;
            const termResult = await this.db.query_executor(termQuery, [term_number, studentDept.department_id]);

            if (termResult.rows.length === 0) {
                return res.status(404).json({ error: `Term ${term_number} not found for department` });
            }

            const term = termResult.rows[0];
            const rows = await this.enrollmentModel.getStudentTermResults(student_id, term.id);

            res.status(200).json({
                student_id,
                term: {
                    id: term.id,
                    term_number: term.term_number,
                    start_date: term.start_date,
                    end_date: term.end_date,
                    department_id: term.department_id,
                },
                results: rows,
            });
        } catch (error) {
            console.error('Get student result by term number error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    assignAdvisorsByRollRange = async (req, res) => {
        try {
            const summary = await this.studentModel.assignAdvisorsByRollRange(req.body || {});
            res.status(201).json(summary);
        } catch (error) {
            console.error("Assign advisors by roll range error:", error);
            const statusCode = Number(error.statusCode) || 500;
            res.status(statusCode).json({ error: error.message });
        }
    }

    getAdvisorAssignmentsForInspection = async (req, res) => {
        try {
            const rows = await this.studentModel.getAdvisorAssignmentsForInspection(req.query || {});
            res.status(200).json({ assignments: rows || [] });
        } catch (error) {
            console.error("Get advisor assignments for inspection error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCurrentAdvisorByStudentId = async (req, res) => {
        try {
            const studentId = Number(req.params.user_id);
            if (!Number.isInteger(studentId) || studentId <= 0) {
                return res.status(400).json({ error: "Invalid student id." });
            }

            const row = await this.studentModel.getCurrentAdvisorByStudentId(studentId);
            res.status(200).json({ current_advisor: row || null });
        } catch (error) {
            console.error("Get current advisor by student id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAdvisorHistoryByStudentId = async (req, res) => {
        try {
            const studentId = Number(req.params.user_id);
            if (!Number.isInteger(studentId) || studentId <= 0) {
                return res.status(400).json({ error: "Invalid student id." });
            }

            const rows = await this.studentModel.getAdvisorHistoryByStudentId(studentId);
            res.status(200).json({ history: rows || [] });
        } catch (error) {
            console.error("Get advisor history by student id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAdvisorTimelineByStudentId = async (req, res) => {
        try {
            const studentId = Number(req.params.user_id);
            if (!Number.isInteger(studentId) || studentId <= 0) {
                return res.status(400).json({ error: "Invalid student id." });
            }

            const rows = await this.studentModel.getAdvisorTimelineByStudentId(studentId);
            res.status(200).json({ timeline: rows || [] });
        } catch (error) {
            console.error("Get advisor timeline by student id error:", error);
            res.status(500).json({ error: error.message });
        }
    }
    
}

module.exports = StudentController;
