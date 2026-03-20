const CourseModel = require('../models/courseModel.js');
const DB_Connection = require('../database/db.js');

class CourseController {
    constructor() {
        this.courseModel = new CourseModel();
        this.db = DB_Connection.getInstance();
    }

    createCoursesBatch = async (req, res) => {
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

        const normalizeCourseType = (value) => {
            const raw = normalize(value).toLowerCase();
            if (raw.includes('lab') || raw.includes('sessional')) return 'Lab';
            return 'Theory';
        };

        const parsePrereqCodes = (value) => {
            if (!value) return [];
            return [...new Set(
                String(value)
                    .split(/[;,|]/)
                    .map((item) => item.trim().toUpperCase())
                    .filter(Boolean)
            )];
        };

        const client = await this.db.pool.connect();
        const results = [];
        const insertedMeta = [];
        let inserted = 0;

        try {
            const departmentsResult = await client.query(`SELECT id, code FROM departments;`);
            const departmentByCode = new Map(
                departmentsResult.rows.map((row) => [String(row.code || '').trim().toUpperCase(), row])
            );

            for (let index = 0; index < rows.length; index += 1) {
                const source = rows[index] || {};
                const rowNumber = index + 1;

                const course_code = normalize(
                    getValue(source, ['course_code', 'Course Code', 'course code', 'code'])
                ).toUpperCase();
                const name = normalize(
                    getValue(source, ['name', 'course_name', 'Course Name', 'course name'])
                );
                const creditRaw = normalize(
                    getValue(source, ['credit_hours', 'Credit Hours', 'credit', 'Credit'])
                );
                const type = normalizeCourseType(
                    getValue(source, ['type', 'Type', 'course_type', 'Course Type'])
                );
                const department_code = normalize(
                    getValue(source, ['department_code', 'Department Code', 'department', 'Department'])
                ).toUpperCase();
                const prereq_codes = parsePrereqCodes(
                    getValue(source, ['prerequisites', 'Prerequisites', 'prereq_codes', 'Prerequisite Codes'])
                );

                const missing = [];
                if (!course_code) missing.push('course_code');
                if (!name) missing.push('name');
                if (!creditRaw) missing.push('credit_hours');
                if (!department_code) missing.push('department_code');

                const credit_hours = Number(creditRaw);
                if (!Number.isFinite(credit_hours) || credit_hours <= 0) {
                    missing.push('credit_hours (must be a positive number)');
                }

                const department = departmentByCode.get(department_code);
                if (!department) {
                    missing.push(`department_code (${department_code}) not found`);
                }

                if (missing.length) {
                    results.push({
                        row: rowNumber,
                        status: 'failed',
                        reason: `Validation failed: ${missing.join(', ')}`,
                    });
                    continue;
                }

                try {
                    await client.query('BEGIN');

                    const existingCode = await client.query(
                        `SELECT 1 FROM courses WHERE course_code = $1 LIMIT 1;`,
                        [course_code]
                    );
                    if (existingCode.rows.length) {
                        throw new Error(`Course code already exists: ${course_code}`);
                    }

                    const insertedCourse = await client.query(
                        `
                            INSERT INTO courses (course_code, name, credit_hours, type, department_id)
                            VALUES ($1, $2, $3, $4, $5)
                            RETURNING id;
                        `,
                        [course_code, name, credit_hours, type, department.id]
                    );

                    await client.query('COMMIT');
                    inserted += 1;

                    const course_id = insertedCourse.rows[0]?.id;
                    insertedMeta.push({ row: rowNumber, course_id, course_code, prereq_codes });
                    results.push({
                        row: rowNumber,
                        status: 'inserted',
                        course_id,
                        course_code,
                    });
                } catch (rowError) {
                    await client.query('ROLLBACK');
                    results.push({
                        row: rowNumber,
                        status: 'failed',
                        reason: rowError.message,
                    });
                }
            }

            if (insertedMeta.length) {
                const courseResult = await client.query(`SELECT id, course_code FROM courses;`);
                const codeToId = new Map(
                    courseResult.rows.map((row) => [String(row.course_code || '').trim().toUpperCase(), Number(row.id)])
                );

                for (const item of insertedMeta) {
                    if (!item.prereq_codes.length) continue;

                    const prereqIds = item.prereq_codes
                        .map((code) => codeToId.get(code))
                        .filter((id) => Number.isInteger(id) && id > 0 && id !== Number(item.course_id));

                    if (!prereqIds.length) continue;

                    await client.query(
                        `
                            INSERT INTO course_prerequisites (course_id, prereq_id)
                            SELECT $1, UNNEST($2::int[])
                            ON CONFLICT (course_id, prereq_id) DO NOTHING;
                        `,
                        [item.course_id, prereqIds]
                    );
                }
            }

            return res.status(200).json({
                total: rows.length,
                inserted,
                failed: rows.length - inserted,
                results,
            });
        } catch (error) {
            console.error("Batch course import error:", error);
            return res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    createCourse = async (req, res) => {
        try {
            const course = await this.courseModel.createCourse(req.body);
            res.status(201).json(course);
        } catch (error) {
            console.error("Create Course error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllCourses = async (req, res) => {
        try {
            const courses = await this.courseModel.getAllCourses();
            res.status(200).json(courses);
        } catch (error) {
            console.error("Get All Courses error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCourseById = async (req, res) => {
        try {
            const course = await this.courseModel.getCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
            res.status(200).json(course);
        } catch (error) {
            console.error("Get Course By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateCourse = async (req, res) => {
        try {
            const course = await this.courseModel.updateCourse(req.params.id, req.body);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
            res.status(200).json(course);
        } catch (error) {
            console.error("Update Course error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteCourse = async (req, res) => {
        try {
            const course = await this.courseModel.deleteCourse(req.params.id);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
            res.status(200).json({ message: "Course deleted successfully" });
        } catch (error) {
            console.error("Delete Course error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    createCourseOffering = async (req, res) => {
        try {
            const offering = await this.courseModel.createCourseOffering(req.body);
            res.status(201).json(offering);
        } catch (error) {
            console.error("Create Course Offering error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCourseOfferingById = async (req, res) => {
        try {
            const offering = await this.courseModel.getCourseOfferingById(req.params.id);
            if (!offering) {
                return res.status(404).json({ message: "Course Offering not found" });
            }
            res.status(200).json(offering);
        } catch (error) {
            console.error("Get Course Offering By Id error:", error);
            res.status(500).json({ error: error.message }); 
        }
    }

    updateCourseOffering = async (req, res) => {
        try {
            const offering = await this.courseModel.updateCourseOffering(req.params.id, req.body);
            if (!offering) {
                return res.status(404).json({ message: "Course Offering not found" });
            }
            res.status(200).json(offering);
        } catch (error) {
            console.error("Update Course Offering error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteCourseOffering = async (req, res) => {
        try {
            const offering = await this.courseModel.deleteCourseOffering(req.params.id);
            if (!offering) {
                return res.status(404).json({ message: "Course Offering not found" });
            }
            res.status(200).json({ message: "Course offering deleted successfully" });
        } catch (error) {
            console.error("Delete Course Offering error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCourseOfferingsByTerm = async (req, res) => {
        try {
            const termId = Number(req.params.term_id);
            const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
            const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

            if (!Number.isFinite(termId) || termId <= 0) {
                return res.status(400).json({ error: "Valid term_id is required." });
            }

            const offerings = await this.courseModel.getCourseOfferingsByTerm(termId, departmentId, includeInactive);

            res.status(200).json({
                term_id: termId,
                department_id: departmentId,
                include_inactive: includeInactive,
                offerings,
            });
        } catch (error) {
            console.error("Get Course Offerings By Term error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CourseController;
