const SystemStateModel = require("../models/systemStateModel.js");

class SystemStateController {
    constructor() {
        this.systemStateModel = new SystemStateModel();
    }

    getState = async (req, res) => {
        try {
            const state = await this.systemStateModel.getCurrentState();

            res.status(200).json({
                state,
                canEdit: req.user?.role === "system",
            });
        } catch (error) {
            console.error("Get system state error:", error);
            res.status(500).json({ error: error.message });
        }
    };

    updateState = async (req, res) => {
        try {
            if (req.user?.role !== "system") {
                return res.status(403).json({ error: "Only system admin can update current state." });
            }

            const { reg_start, reg_end, term_start, term_end } = req.body;

            if (!reg_start || !reg_end || !term_start || !term_end) {
                return res.status(400).json({ error: "reg_start, reg_end, term_start and term_end are required." });
            }

            if (new Date(reg_start) > new Date(reg_end)) {
                return res.status(400).json({ error: "reg_start must be earlier than or equal to reg_end." });
            }

            if (new Date(term_start) > new Date(term_end)) {
                return res.status(400).json({ error: "term_start must be earlier than or equal to term_end." });
            }

            const duplicateGroups = await this.systemStateModel.getDuplicateTermNumberGroups();
            if (duplicateGroups.length > 0) {
                return res.status(409).json({
                    error: "Duplicate (department_id, term_number) rows exist in terms. Resolve duplicates before global term date sync.",
                    duplicateGroups,
                });
            }

            const insertedTerms = await this.systemStateModel.seedMissingTermsForDepartments(term_start, term_end);
            const updatedState = await this.systemStateModel.upsertCurrentState({
                reg_start,
                reg_end,
                term_start,
                term_end,
                updated_by: req.user.id,
            });
            const syncedTerms = await this.systemStateModel.syncAllTermDateWindow(term_start, term_end);

            res.status(200).json({
                message: "System state updated successfully.",
                insertedTerms,
                syncedTerms,
                state: updatedState,
            });
        } catch (error) {
            console.error("Update system state error:", error);
            res.status(500).json({ error: error.message });
        }
    };

    endCurrentSession = async (req, res) => {
        try {
            if (req.user?.role !== 'system') {
                return res.status(403).json({ error: 'Only system admin can end current session.' });
            }

            if (req.body?.confirm !== true) {
                return res.status(400).json({
                    error: 'confirm=true is required to execute this operation.',
                });
            }

            const result = await this.systemStateModel.endCurrentSessionAndPromote({
                triggeredByUserId: Number(req.user?.id) || null,
                reason: req.body?.reason || null,
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('End current session error:', error);

            if (Number(error.statusCode) >= 400) {
                return res.status(Number(error.statusCode)).json({
                    error: error.message,
                });
            }

            return res.status(500).json({ error: error.message });
        }
    };

    previewEndCurrentSession = async (req, res) => {
        try {
            if (req.user?.role !== 'system') {
                return res.status(403).json({ error: 'Only system admin can preview session end impact.' });
            }

            const preview = await this.systemStateModel.previewEndCurrentSessionImpact();
            return res.status(200).json(preview);
        } catch (error) {
            console.error('Preview end current session error:', error);

            if (Number(error.statusCode) >= 400 && Number(error.statusCode) < 500) {
                return res.status(200).json({
                    message: 'Session-end impact preview generated.',
                    can_execute: false,
                    blocking_reason: error.message,
                    session_window: null,
                    summary: {
                        terms_processed: 0,
                        students_considered: 0,
                        students_eligible_for_next_term: 0,
                        students_will_graduate: 0,
                        students_not_eligible: 0,
                        pending_to_auto_approve: 0,
                        enrollments_to_archive: 0,
                        enrollments_missing_grade_to_f: 0,
                    },
                    terms_processed: [],
                    eligible_next_term_targets: [],
                    ineligible_reason_breakdown: [],
                });
            }

            return res.status(500).json({ error: error.message });
        }
    };
}

module.exports = SystemStateController;
