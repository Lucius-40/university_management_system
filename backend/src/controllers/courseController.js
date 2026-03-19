const CourseModel = require('../models/courseModel.js');

class CourseController {
    constructor() {
        this.courseModel = new CourseModel();
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
