const PaymentModel = require('../models/paymentModel.js');

class PaymentController {
    constructor() {
        this.paymentModel = new PaymentModel();
    }

    createDue = async (req, res) => {
        try {
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
}

module.exports = PaymentController;
