const { runWithLogging } = require('../utils/runWithLogging.js');
const DepartmentModel = require('../models/departmentModel.js');

class DepartmentController {
    constructor() {
        this.model = new DepartmentModel();
    }

    create = (req, res) => {
        return runWithLogging(
            'Create department from controller',
            async () => {
                const { building_id, bank_account_id, name } = req.body;
                if (!building_id || !bank_account_id || !name) {
                    return res.status(400).json({
                        success: false,
                        message: 'All fields are required'
                    });
                }

                const payload = { building_id, bank_account_id, name };
                const newDepartment = await this.model.createDepartment(payload);
                if (!newDepartment) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create department'
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Department created!',
                    data: newDepartment
                });
            }
        );
    }

    update = (req, res) => {
        return runWithLogging(
            'Update department from controller',
            async () => {
                const { id, building_id, bank_account_id, name } = req.body;
                if (!id || !building_id || !bank_account_id || !name) {
                    return res.status(400).json({
                        success: false,
                        message: 'All fields including id are required'
                    });
                }

                const payload = { id, building_id, bank_account_id, name };
                const updatedDepartment = await this.model.updateDepartment(payload);
                if (!updatedDepartment) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update department'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Department updated!'
                });
            }
        );
    }

    delete = (req, res) => {
        return runWithLogging(
            'Delete department from controller',
            async () => {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const response = await this.model.deleteDepartment(id);
                if (!response) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to delete department'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Department deleted!'
                });
            }
        );
    }

    getById = (req, res) => {
        return runWithLogging(
            'Get department by id from controller',
            async () => {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const department = await this.model.getDepartmentById(id);
                if (!department) {
                    return res.status(404).json({
                        success: false,
                        message: 'Department not found'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: department
                });
            }
        );
    }
}

module.exports = DepartmentController;