const TermModel = require('../models/termModel.js');

class TermController {
    constructor() {
        this.termModel = new TermModel();
    }

    createTerm = async (req, res) => {
        try {
            const term = await this.termModel.createTerm(req.body);
            res.status(201).json(term);
        } catch (error) {
            console.error("Create Term error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllTerms = async (req, res) => {
        try {
            const terms = await this.termModel.getAllTerms();
            res.status(200).json(terms);
        } catch (error) {
            console.error("Get All Terms error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getTermById = async (req, res) => {
        try {
            const term = await this.termModel.getTermById(req.params.id);
            if (!term) {
                return res.status(404).json({ message: "Term not found" });
            }
            res.status(200).json(term);
        } catch (error) {
            console.error("Get Term By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateTerm = async (req, res) => {
        try {
            const term = await this.termModel.updateTerm(req.params.id, req.body);
            if (!term) {
                return res.status(404).json({ message: "Term not found" });
            }
            res.status(200).json(term);
        } catch (error) {
            console.error("Update Term error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteTerm = async (req, res) => {
        try {
            const term = await this.termModel.deleteTerm(req.params.id);
            if (!term) {
                return res.status(404).json({ message: "Term not found" });
            }
            res.status(200).json({ message: "Term deleted successfully" });
        } catch (error) {
            console.error("Delete Term error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TermController;
