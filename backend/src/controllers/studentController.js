const StudentModel = require('../models/studentModel.js');

class StudentController {
    constructor() {
        this.studentModel = new StudentModel();
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
}

module.exports = StudentController;
