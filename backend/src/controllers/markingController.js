const MarkingModel = require('../models/markingModel.js');

class MarkingController {
    constructor() {
        this.markingModel = new MarkingModel();
    }

    requireTeacherRole = (req, res) => {
        if (String(req.user?.role || '').toLowerCase() !== 'teacher') {
            res.status(403).json({ error: 'Only teachers can perform this action.' });
            return false;
        }
        return true;
    }

    parseCsvRows = (csvText) => {
        const lines = String(csvText || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length < 2) {
            const error = new Error('CSV must include a header and at least one data row.');
            error.status = 400;
            throw error;
        }

        const headers = lines[0].split(',').map((h) => String(h || '').trim().toLowerCase());
        const getIndex = (name) => headers.indexOf(name);
        const idxEnrollmentId = getIndex('enrollment_id');
        const idxMarksObtained = getIndex('marks_obtained');

        if (idxEnrollmentId < 0 || idxMarksObtained < 0) {
            const error = new Error('CSV header must include enrollment_id and marks_obtained.');
            error.status = 400;
            throw error;
        }

        const idxComponentId = getIndex('component_id');
        const idxTotalMarks = getIndex('total_marks');
        const idxStatus = getIndex('status');

        const rows = [];
        for (let i = 1; i < lines.length; i += 1) {
            const values = lines[i].split(',').map((v) => String(v || '').trim());
            rows.push({
                enrollment_id: values[idxEnrollmentId],
                marks_obtained: values[idxMarksObtained],
                component_id: idxComponentId >= 0 ? values[idxComponentId] : undefined,
                total_marks: idxTotalMarks >= 0 ? values[idxTotalMarks] : undefined,
                status: idxStatus >= 0 ? values[idxStatus] : undefined,
            });
        }

        return rows;
    }

    createMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.createMarkingComponent(req.body);
            res.status(201).json(marking);
        } catch (error) {
            console.error("Create Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllMarkingComponents = async (req, res) => {
        try {
            const markings = await this.markingModel.getAllMarkingComponents();
            res.status(200).json(markings);
        } catch (error) {
            console.error("Get All Markings error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getMarkingComponentById = async (req, res) => {
        try {
            const marking = await this.markingModel.getMarkingComponentById(req.params.id);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json(marking);
        } catch (error) {
            console.error("Get Marking By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.updateMarkingComponent(req.params.id, req.body);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json(marking);
        } catch (error) {
            console.error("Update Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.deleteMarkingComponent(req.params.id);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json({ message: "Marking Component deleted successfully" });
        } catch (error) {
             console.error("Delete Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getTeacherMarkingContexts = async (req, res) => {
        try {
            if (!this.requireTeacherRole(req, res)) return;
            const teacherId = Number(req.user?.id);
            const contexts = await this.markingModel.getTeacherMarkingContexts(teacherId);
            res.status(200).json(contexts);
        } catch (error) {
            console.error('Get Teacher Marking Contexts error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    getTeacherMarkingWorkspace = async (req, res) => {
        try {
            if (!this.requireTeacherRole(req, res)) return;

            const teacherId = Number(req.user?.id);
            const courseOfferingId = Number(req.query.course_offering_id);
            const sectionName = String(req.query.section_name || '').trim();

            if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0 || !sectionName) {
                return res.status(400).json({
                    error: 'course_offering_id (positive integer) and section_name are required.',
                });
            }

            const workspace = await this.markingModel.getTeacherMarkingWorkspace({
                teacherId,
                courseOfferingId,
                sectionName,
            });

            res.status(200).json(workspace);
        } catch (error) {
            console.error('Get Teacher Marking Workspace error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    submitTeacherManualMarks = async (req, res) => {
        try {
            if (!this.requireTeacherRole(req, res)) return;

            const teacherId = Number(req.user?.id);
            const courseOfferingId = Number(req.body?.course_offering_id);
            const sectionName = String(req.body?.section_name || '').trim();

            if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0 || !sectionName) {
                return res.status(400).json({
                    error: 'course_offering_id (positive integer) and section_name are required.',
                });
            }

            const result = await this.markingModel.processTeacherMarkingBatch({
                teacherId,
                courseOfferingId,
                sectionName,
                markType: req.body?.mark_type,
                totalMarks: req.body?.total_marks,
                status: req.body?.status,
                rows: Array.isArray(req.body?.rows) ? req.body.rows : [],
                dryRun: false,
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Submit Teacher Manual Marks error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    uploadTeacherMarksCsv = async (req, res) => {
        try {
            if (!this.requireTeacherRole(req, res)) return;

            const teacherId = Number(req.user?.id);
            const courseOfferingId = Number(req.body?.course_offering_id);
            const sectionName = String(req.body?.section_name || '').trim();
            const dryRun = String(req.query?.dry_run || req.body?.dry_run || 'true').toLowerCase() !== 'false';

            if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0 || !sectionName) {
                return res.status(400).json({
                    error: 'course_offering_id (positive integer) and section_name are required.',
                });
            }

            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ error: 'CSV file is required.' });
            }

            const csvRows = this.parseCsvRows(req.file.buffer.toString('utf-8'));

            const result = await this.markingModel.processTeacherMarkingBatch({
                teacherId,
                courseOfferingId,
                sectionName,
                markType: req.body?.mark_type,
                totalMarks: req.body?.total_marks,
                status: req.body?.status,
                rows: csvRows,
                dryRun,
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Upload Teacher Marks CSV error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }
}

module.exports = MarkingController;
