const DepartmentModel = require('../models/departmentModel.js');

class DepartmentController {
    constructor() {
        this.departmentModel = new DepartmentModel();
    }

    createDepartment = async (req, res) => {
        try {
            const department = await this.departmentModel.createDepartment(req.body);
            res.status(201).json(department);
        } catch (error) {
            console.error("Create Department error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllDepartments = async (req, res) => {
        try {
            const departments = await this.departmentModel.getAllDepartments();
            res.status(200).json(departments);
        } catch (error) {
            console.error("Get All Departments error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getDepartmentById = async (req, res) => {
        try {
            const department = await this.departmentModel.getDepartmentById(req.params.id);
            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }
            res.status(200).json(department);
        } catch (error) {
            console.error("Get Department By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateDepartment = async (req, res) => {
        try {
            const department = await this.departmentModel.updateDepartment(req.params.id, req.body);
            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }
            res.status(200).json(department);
        } catch (error) {
            console.error("Update Department error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteDepartment = async (req, res) => {
        try {
            const department = await this.departmentModel.deleteDepartment(req.params.id);
            if (!department) {
                return res.status(404).json({ message: "Department not found" });
            }
            res.status(200).json({ message: "Department deleted successfully" });
        } catch (error) {
            console.error("Delete Department error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DepartmentController;
