const PaymentModel = require('../models/paymentModel.js');

class PaymentController {
    constructor() {
        this.paymentModel = new PaymentModel();
    }

    requireSystemRole = (req, res) => {
        if (req.user?.role !== 'system') {
            res.status(403).json({ error: 'Only system admin can perform this action.' });
            return false;
        }
        return true;
    }

    createDue = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const due = await this.paymentModel.createDue(req.body);
            res.status(201).json(due);
        } catch (error) {
            console.error("Create Due error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllDues = async (req, res) => {
        try {
            const dues = await this.paymentModel.getAllDues();
            res.status(200).json(dues);
        } catch (error) {
            console.error("Get All Dues error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getDueById = async (req, res) => {
        try {
            const due = await this.paymentModel.getDueById(req.params.id);
            if (!due) {
                return res.status(404).json({ message: "Due not found" });
            }
            res.status(200).json(due);
        } catch (error) {
            console.error("Get Due By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateDue = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const due = await this.paymentModel.updateDue(req.params.id, req.body);
            if (!due) {
                return res.status(404).json({ message: "Due not found" });
            }
            res.status(200).json(due);
        } catch (error) {
            console.error("Update Due error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteDue = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const due = await this.paymentModel.deleteDue(req.params.id);
            if (!due) {
                return res.status(404).json({ message: "Due not found" });
            }
            res.status(200).json({ message: "Due deleted successfully" });
        } catch (error) {
            console.error("Delete Due error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    createStudentDuesPayment = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const payment = await this.paymentModel.createStudentDuesPayment(req.body);
            res.status(201).json(payment);
        } catch (error) {
             console.error("Create Payment error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getStudentDuesPayments = async (req, res) => {
        try {
            const payments = await this.paymentModel.getStudentDuesPayments(req.params.student_id);
            res.status(200).json(payments);
        } catch (error) {
            console.error("Get Student Payments error:", error);
            res.status(500).json({ error: error.message }); 
        }
    }

    createDueRule = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const rule = await this.paymentModel.createDueRule(req.body);
            res.status(201).json(rule);
        } catch (error) {
            console.error('Create Due Rule error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllDueRules = async (req, res) => {
        try {
            const rules = await this.paymentModel.getAllDueRules();
            res.status(200).json(rules);
        } catch (error) {
            console.error('Get Due Rules error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    createDueRuleScope = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const scope = await this.paymentModel.createDueRuleScope(req.params.rule_id, req.body);
            res.status(201).json(scope);
        } catch (error) {
            console.error('Create Due Rule Scope error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    createDueRuleAmountOverride = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const override = await this.paymentModel.createDueRuleAmountOverride(req.params.rule_id, req.body);
            res.status(201).json(override);
        } catch (error) {
            console.error('Create Due Rule Amount Override error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    previewDueRuleIssuance = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const ruleId = Number(req.params.rule_id);

            if (!Number.isFinite(ruleId) || ruleId <= 0) {
                return res.status(400).json({ error: 'Valid rule_id is required.' });
            }

            const rows = await this.paymentModel.previewDueRuleIssuance(ruleId);
            res.status(200).json({
                rule_id: ruleId,
                matched_count: rows.length,
                issuable_count: rows.filter((row) => row.can_issue).length,
                rows,
            });
        } catch (error) {
            console.error('Preview Due Rule Issuance error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    issueDueRuleNow = async (req, res) => {
        try {
            if (!this.requireSystemRole(req, res)) return;
            const ruleId = Number(req.params.rule_id);

            if (!Number.isFinite(ruleId) || ruleId <= 0) {
                return res.status(400).json({ error: 'Valid rule_id is required.' });
            }

            const result = await this.paymentModel.issueDueRuleNow(ruleId, req.user?.id || null);
            res.status(200).json({
                message: 'Due issuance completed.',
                ...result,
            });
        } catch (error) {
            console.error('Issue Due Rule error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PaymentController;
