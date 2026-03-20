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

    getDepartmentFullDetails = async (req, res) => {
        try {
            const details = await this.departmentModel.getDepartmentFullDetails(req.params.identifier);
            if (!details) {
                return res.status(404).json({ message: "Department not found" });
            }
            res.status(200).json(details);
        } catch (error) {
            console.error("Get Department Full Details error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCurrentDepartmentHead = async (req, res) => {
        try {
            const departmentId = Number(req.params.id);
            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ error: "Invalid department id." });
            }

            const row = await this.departmentModel.getCurrentDepartmentHead(departmentId);
            res.status(200).json({ current_head: row || null });
        } catch (error) {
            console.error("Get Current Department Head error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getDepartmentHeadHistory = async (req, res) => {
        try {
            const departmentId = Number(req.params.id);
            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ error: "Invalid department id." });
            }

            const rows = await this.departmentModel.getDepartmentHeadHistory(departmentId);
            res.status(200).json({ history: rows || [] });
        } catch (error) {
            console.error("Get Department Head History error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getDepartmentHeadTimeline = async (req, res) => {
        try {
            const departmentId = Number(req.params.id);
            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ error: "Invalid department id." });
            }

            const rows = await this.departmentModel.getDepartmentHeadTimeline(departmentId);
            res.status(200).json({ timeline: rows || [] });
        } catch (error) {
            console.error("Get Department Head Timeline error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    assignDepartmentHead = async (req, res) => {
        try {
            const departmentId = Number(req.params.id);
            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ error: "Invalid department id." });
            }

            const row = await this.departmentModel.assignDepartmentHead(departmentId, req.body || {});
            res.status(201).json(row);
        } catch (error) {
            console.error("Assign Department Head error:", error);
            const statusCode = Number(error.statusCode) || 500;
            res.status(statusCode).json({ error: error.message });
        }
    }

    updateDepartmentHeadTimelineEntry = async (req, res) => {
        try {
            const departmentId = Number(req.params.id);
            const entryId = Number(req.params.entryId);

            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({ error: "Invalid department id." });
            }

            if (!Number.isInteger(entryId) || entryId <= 0) {
                return res.status(400).json({ error: "Invalid timeline entry id." });
            }

            const row = await this.departmentModel.updateDepartmentHeadTimelineEntry(
                departmentId,
                entryId,
                req.body || {}
            );

            if (!row) {
                return res.status(404).json({ error: "Department head timeline entry not found." });
            }

            res.status(200).json(row);
        } catch (error) {
            console.error("Update Department Head Timeline Entry error:", error);
            const statusCode = Number(error.statusCode) || 500;
            res.status(statusCode).json({ error: error.message });
        }
    }
}

module.exports = DepartmentController;
