const StudentModel = require('../models/studentModel.js');
const EnrollmentModel = require('../models/enrollmentModel.js');
const CourseModel = require('../models/courseModel.js');
const SectionModel = require('../models/sectionModel.js');
const DB_Connection = require('../database/db.js');

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

    getAllStudents = async (req, res) => {
        try {
            const students = await this.studentModel.getAllStudents();
            res.status(200).json(students);
        } catch (error) {
            console.error("Get All Students error:", error);
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

            // Validate input
            if (!term_number || !section_name || !course_offering_ids || !Array.isArray(course_offering_ids) || course_offering_ids.length === 0) {
                return res.status(400).json({ 
                    error: "Missing required fields: term_number, section_name, and course_offering_ids array" 
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

            // 5. Verify section exists for this term
            const sectionExists = await this.sectionModel.checkSectionExists(term.id, section_name);
            if (!sectionExists) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Section ${section_name} does not exist for term ${term_number}` 
                });
            }

            // 6. Check for overdue dues
            const overdueDues = await this.studentModel.hasOverdueDues(student_id);
            if (overdueDues.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: "Cannot register with overdue dues",
                    overdue_dues: overdueDues
                });
            }

            // 7. Get student's completed courses (for prerequisite checking)
            const completedCourses = await this.studentModel.getCompletedCourses(student_id);
            const completedCourseIds = completedCourses.map(c => c.course_id);

            // 8. Get current term credits already enrolled
            const currentCredits = await this.enrollmentModel.getTotalCreditsForTerm(student_id, term.id);

            // 9. Process each course offering
            const enrollments = [];
            const warnings = [];
            let totalNewCredits = 0;

            for (const offering_id of course_offering_ids) {
                // Get course offering details
                const offering = await this.courseModel.getCourseOfferingDetails(offering_id);
                
                if (!offering) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Course offering ${offering_id} not found` 
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
                const previousEnrollment = await this.enrollmentModel.checkPreviousEnrollment(student_id, offering.course_id);
                const isRetake = !!previousEnrollment;
                
                // Block enrollment if student already passed this course (grades D or better)
                const passingGrades = ['A+', 'A', 'A-', 'B', 'C', 'D'];
                if (previousEnrollment && passingGrades.includes(previousEnrollment.grade)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        error: `Cannot re-enroll in ${offering.course_code}. You already passed with grade ${previousEnrollment.grade}` 
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

                // Prepare enrollment data
                enrollments.push({
                    student_id,
                    course_offering_id: offering_id,
                    credit_when_taking: offering.credit_hours,
                    status: 'Pending',
                    is_retake: isRetake
                });
            }

            // 10. Check credit limit
            const totalCredits = parseFloat(currentCredits) + totalNewCredits;
            if (totalCredits > 23) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Credit limit exceeded. Current: ${currentCredits}, Attempting to add: ${totalNewCredits}, Total: ${totalCredits}, Max: 23` 
                });
            }

            // 11. Assign student to section
            const sectionAssignment = await this.sectionModel.assignStudentToSection(student_id, section_name);

            // 12. Create all enrollments
            const createdEnrollments = [];
            for (const enrollment of enrollments) {
                const created = await this.enrollmentModel.createEnrollment(enrollment);
                createdEnrollments.push(created);
            }

            // 13. Get advisor info
            const advisor = await this.studentModel.getCurrentAdvisor(student_id);

            await client.query('COMMIT');

            res.status(201).json({
                message: "Registration successful. Enrollments pending advisor approval.",
                enrollments: createdEnrollments,
                section_assignment: sectionAssignment,
                advisor: advisor ? {
                    id: advisor.teacher_id,
                    name: advisor.advisor_name,
                    email: advisor.advisor_email
                } : null,
                credits: {
                    previous: parseFloat(currentCredits),
                    new: totalNewCredits,
                    total: totalCredits,
                    limit: 23
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

            // Get current enrollments
            const currentEnrollments = await this.enrollmentModel.getEnrollmentsByStudent(student_id, term.id);
            const enrolledOfferingIds = currentEnrollments.map(e => e.course_offering_id);

            // Enrich offerings with additional info
            const enrichedOfferings = await Promise.all(offerings.map(async (offering) => {
                const prerequisites = await this.courseModel.getCoursePrerequisites(offering.course_id);
                const enrollmentCount = await this.courseModel.getCourseOfferingEnrollmentCount(offering.id);
                const previousEnrollment = await this.enrollmentModel.checkPreviousEnrollment(student_id, offering.course_id);
                
                const missingPrereqs = prerequisites.filter(prereq => 
                    !completedCourseIds.includes(prereq.prereq_id)
                );

                const isAlreadyEnrolled = enrolledOfferingIds.includes(offering.id);

                // Check if student passed this course before (grades D or better)
                const passingGrades = ['A+', 'A', 'A-', 'B', 'C', 'D'];
                const hasPassed = previousEnrollment && passingGrades.includes(previousEnrollment.grade);
                
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
                    is_retake: !!previousEnrollment,
                    previous_grade: previousEnrollment?.grade || null,
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
                    end_date: term.end_date
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

            // Check dues
            const overdueDues = await this.studentModel.hasOverdueDues(student_id);

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
                           overdueDues.length === 0 &&
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
                    end_date: term.end_date
                } : null,
                overdue_dues: overdueDues,
                has_overdue_dues: overdueDues.length > 0,
                advisor: advisor ? {
                    id: advisor.teacher_id,
                    name: advisor.advisor_name,
                    email: advisor.advisor_email
                } : null,
                sections,
                credits: {
                    current: parseFloat(currentCredits),
                    remaining: 23 - parseFloat(currentCredits),
                    limit: 23
                }
            });

        } catch (error) {
            console.error("Get registration eligibility error:", error);
            res.status(500).json({ error: error.message });
        }
    }
    
}

module.exports = StudentController;
