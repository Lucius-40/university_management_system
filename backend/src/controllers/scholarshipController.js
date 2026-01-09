const { runWithLogging } = require('../utils/runWithLogging.js');
const ScholarshipModel = require('../models/scholarshipModel.js');

class ScholarshipController {
    constructor() {
        this.model = new ScholarshipModel();
    }

    create = (req, res) => {
        return runWithLogging(
            'Create scholarship from controller',
            async () => {
                const { bank_account_id, name, requirements, status } = req.body;
                if (bank_account_id === undefined || !name || !requirements || typeof status !== 'boolean') {
                    return res.status(400).json({
                        success: false,
                        message: 'All fields are required and status must be boolean'
                    });
                }
                const payload = { bank_account_id, name, requirements, status };
                const newScholarship = await this.model.createScholarship(payload);
                if (!newScholarship) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create scholarship'
                    });
                }
                return res.status(201).json({
                    success: true,
                    message: 'Scholarship created!',
                    data: newScholarship
                });
            }
        );
    }

    update = (req, res) => {
        return runWithLogging(
            'Update scholarship from controller',
            async () => {
                const { id, bank_account_id, name, requirements, status } = req.body;
                if (!id || bank_account_id === undefined || !name || !requirements || typeof status !== 'boolean') {
                    return res.status(400).json({
                        success: false,
                        message: 'All fields including id are required and status must be boolean'
                    });
                }
                const payload = { id, bank_account_id, name, requirements, status };
                const updatedScholarship = await this.model.updateScholarship(payload);
                if (!updatedScholarship) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update scholarship'
                    });
                }
                return res.status(200).json({
                    success: true,
                    message: 'Scholarship updated!'
                });
            }
        );
    }

    delete = (req, res) => {
        return runWithLogging(
            'Delete scholarship from controller',
            async () => {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }
                const response = await this.model.deleteScholarship(id);
                if (!response) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to delete scholarship'
                    });
                }
                return res.status(200).json({
                    success: true,
                    message: 'Scholarship deleted!'
                });
            }
        );
    }

    getById = (req, res) => {
        return runWithLogging(
            'Get scholarship by id from controller',
            async () => {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }
                const scholarship = await this.model.getScholarshipById(id);
                if (!scholarship) {
                    return res.status(404).json({
                        success: false,
                        message: 'Scholarship not found'
                    });
                }
                return res.status(200).json({
                    success: true,
                    data: scholarship
                });
            }
        );
    }
}

module.exports = ScholarshipController;
