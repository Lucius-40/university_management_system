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

            res.status(200).json({
                message: "System state updated successfully.",
                insertedTerms,
                state: updatedState,
            });
        } catch (error) {
            console.error("Update system state error:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = SystemStateController;
