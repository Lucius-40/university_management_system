const TeacherModel = require('../models/teacherModel.js');

class TeacherController {
    constructor() {
        this.teacherModel = new TeacherModel();
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
